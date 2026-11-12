import { NextRequest, NextResponse } from 'next/server';
import {
  getR2ConfigStatus,
  listR2Objects,
  putR2Object,
  putR2ObjectFromDataUrl,
  updateR2ObjectMetadata,
  deleteR2Object,
  extractR2KeyFromCdnUrl,
  syncAllObjectsToRemoteR2,
  testR2Connection,
  saveStoredCredentials,
  loadStoredCredentialsSync,
} from '@/lib/r2-storage';
import { getCmsState, saveCmsState } from '@/lib/text-manager';

export const dynamic = 'force-dynamic';

async function syncCmsStateOnR2Update(
  oldKey: string,
  newRecord: { r2Key: string; cdnUrl: string; alt?: string; title?: string }
) {
  try {
    const state = await getCmsState();
    let changed = false;
    const versionedCdnUrl = `${newRecord.cdnUrl}${newRecord.cdnUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;

    for (const [slotId, ov] of Object.entries(state.imageOverrides)) {
      const ovKey = ov.r2Key || extractR2KeyFromCdnUrl(ov.src);
      if (ovKey === oldKey || ovKey === newRecord.r2Key) {
        state.imageOverrides[slotId] = {
          ...ov,
          src: versionedCdnUrl,
          lightboxHref: versionedCdnUrl,
          r2Key: newRecord.r2Key,
          alt: newRecord.alt !== undefined ? newRecord.alt : ov.alt,
          label: newRecord.title !== undefined ? newRecord.title : ov.label,
          isDeleted: false,
          updatedAt: new Date().toISOString(),
        };
        changed = true;
      }
    }

    state.sectionGalleryItems = state.sectionGalleryItems.map((item) => {
      const itemKey = item.r2Key || extractR2KeyFromCdnUrl(item.src);
      if (itemKey === oldKey || itemKey === newRecord.r2Key) {
        changed = true;
        return {
          ...item,
          src: versionedCdnUrl,
          r2Key: newRecord.r2Key,
          alt: newRecord.alt !== undefined ? newRecord.alt : item.alt,
          title: newRecord.title !== undefined ? newRecord.title : item.title,
        };
      }
      return item;
    });

    if (changed) {
      await saveCmsState(state);
    }
  } catch (err) {
    console.warn('CMS sync on R2 update warning:', err);
  }
}

async function syncCmsStateOnR2Delete(deletedKey: string) {
  try {
    const state = await getCmsState();
    let changed = false;

    for (const [slotId, ov] of Object.entries(state.imageOverrides)) {
      const ovKey = ov.r2Key || extractR2KeyFromCdnUrl(ov.src);
      if (ovKey === deletedKey) {
        state.imageOverrides[slotId] = {
          ...ov,
          src: '',
          lightboxHref: '',
          r2Key: undefined,
          isDeleted: true,
          updatedAt: new Date().toISOString(),
        };
        changed = true;
      }
    }

    const beforeCount = state.sectionGalleryItems.length;
    state.sectionGalleryItems = state.sectionGalleryItems.filter((item) => {
      const itemKey = item.r2Key || extractR2KeyFromCdnUrl(item.src);
      return itemKey !== deletedKey;
    });
    if (state.sectionGalleryItems.length !== beforeCount) {
      changed = true;
    }

    if (changed) {
      await saveCmsState(state);
    }
  } catch (err) {
    console.warn('CMS sync on R2 delete warning:', err);
  }
}

export async function GET() {
  try {
    const status = getR2ConfigStatus();
    const stored = loadStoredCredentialsSync();
    const testResult = await testR2Connection();
    const objects = await listR2Objects();
    return NextResponse.json(
      {
        ok: true,
        bucketName: status.bucketName,
        accountId: status.accountId,
        authMode: status.authMode,
        remoteConfigured: status.remoteConfigured,
        cdnBaseUrl: status.cdnBaseUrl,
        warning: status.warning,
        hasAccessKey: status.hasAccessKey,
        hasSecretKey: status.hasSecretKey,
        secretIsUrlEndpoint: status.secretIsUrlEndpoint,
        storedConfig: {
          accountId: stored.accountId || '',
          bucketName: stored.bucketName || '',
          accessKeyId: stored.accessKeyId ? `${stored.accessKeyId.slice(0, 6)}...` : '',
          hasSecret: Boolean(stored.secretAccessKey),
          hasApiToken: Boolean(stored.apiToken),
          cdnBaseUrl: stored.cdnBaseUrl || '',
          updatedAt: stored.updatedAt,
        },
        testResult,
        objects,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list R2 bucket objects';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file || file.size === 0) {
        return NextResponse.json(
          { error: 'Image file is required for R2 upload' },
          { status: 400 }
        );
      }

      const customKey = formData.get('customKey') ? String(formData.get('customKey')) : undefined;
      const replaceKey = formData.get('replaceKey')
        ? String(formData.get('replaceKey'))
        : undefined;
      const alt = formData.get('alt') !== null ? String(formData.get('alt')) : undefined;
      const title = formData.get('title') !== null ? String(formData.get('title')) : undefined;
      const page = formData.get('page') ? String(formData.get('page')) : undefined;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const record = await putR2Object({
        buffer,
        originalFilename: file.name,
        mimeType: file.type || undefined,
        customKey,
        replaceKey,
        alt,
        title,
        page,
      });

      if (replaceKey || customKey) {
        await syncCmsStateOnR2Update(replaceKey || record.r2Key, {
          r2Key: record.r2Key,
          cdnUrl: record.cdnUrl,
          alt: record.alt,
          title: record.title,
        });
      }

      const objects = await listR2Objects();
      return NextResponse.json({
        ok: true,
        object: record,
        r2Key: record.r2Key,
        cdnUrl: record.cdnUrl,
        sizeBytes: record.sizeBytes,
        mimeType: record.mimeType,
        remotePushed: record.remotePushed,
        remoteError: record.remoteError,
        objects,
      });
    }

    const body = await req.json();

    if (body.action === 'test-connection') {
      const testResult = await testR2Connection();
      const status = getR2ConfigStatus();
      return NextResponse.json({
        ok: true,
        testResult,
        status,
      });
    }

    if (body.action === 'save-credentials') {
      await saveStoredCredentials({
        accountId: body.accountId !== undefined ? String(body.accountId).trim() : undefined,
        bucketName: body.bucketName !== undefined ? String(body.bucketName).trim() : undefined,
        accessKeyId: body.accessKeyId !== undefined ? String(body.accessKeyId).trim() : undefined,
        secretAccessKey: body.secretAccessKey !== undefined ? String(body.secretAccessKey).trim() : undefined,
        apiToken: body.apiToken !== undefined ? String(body.apiToken).trim() : undefined,
        cdnBaseUrl: body.cdnBaseUrl !== undefined ? String(body.cdnBaseUrl).trim() : undefined,
      });
      const status = getR2ConfigStatus();
      const testResult = await testR2Connection();
      return NextResponse.json({
        ok: true,
        status,
        testResult,
      });
    }

    if (body.action === 'upload-data-url' && typeof body.dataUrl === 'string') {
      const record = await putR2ObjectFromDataUrl({
        dataUrl: body.dataUrl,
        filenameHint: body.filenameHint ? String(body.filenameHint) : undefined,
        alt: body.alt ? String(body.alt) : undefined,
        title: body.title ? String(body.title) : undefined,
        page: body.page ? String(body.page) : undefined,
      });
      const objects = await listR2Objects();
      return NextResponse.json({
        ok: true,
        object: record,
        r2Key: record.r2Key,
        cdnUrl: record.cdnUrl,
        remotePushed: record.remotePushed,
        remoteError: record.remoteError,
        objects,
      });
    }

    if (body.action === 'update-meta' && body.r2Key) {
      const oldKey = String(body.r2Key);
      const updated = await updateR2ObjectMetadata({
        r2Key: oldKey,
        newKey: body.newKey ? String(body.newKey) : undefined,
        alt: body.alt !== undefined ? String(body.alt) : undefined,
        title: body.title !== undefined ? String(body.title) : undefined,
        page: body.page !== undefined ? String(body.page) : undefined,
      });
      await syncCmsStateOnR2Update(oldKey, {
        r2Key: updated.r2Key,
        cdnUrl: updated.cdnUrl,
        alt: updated.alt,
        title: updated.title,
      });
      const objects = await listR2Objects();
      return NextResponse.json({
        ok: true,
        object: updated,
        r2Key: updated.r2Key,
        cdnUrl: updated.cdnUrl,
        objects,
      });
    }

    if (body.action === 'delete' && (body.r2Key || body.cdnUrl)) {
      const result = await deleteR2Object(String(body.r2Key || body.cdnUrl));
      await syncCmsStateOnR2Delete(result.deletedKey);
      const objects = await listR2Objects();
      return NextResponse.json({
        ok: true,
        deletedKey: result.deletedKey,
        objects,
      });
    }

    if (body.action === 'sync-remote-r2') {
      const syncResult = await syncAllObjectsToRemoteR2({
        limit: typeof body.limit === 'number' ? body.limit : undefined,
        offset: typeof body.offset === 'number' ? body.offset : undefined,
      });
      return NextResponse.json({
        ok: true,
        ...syncResult,
      });
    }

    return NextResponse.json({ error: 'Unsupported R2 bucket operation' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'R2 bucket operation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.r2Key) {
      return NextResponse.json({ error: 'r2Key is required' }, { status: 400 });
    }
    const oldKey = String(body.r2Key);
    const updated = await updateR2ObjectMetadata({
      r2Key: oldKey,
      newKey: body.newKey ? String(body.newKey) : undefined,
      alt: body.alt !== undefined ? String(body.alt) : undefined,
      title: body.title !== undefined ? String(body.title) : undefined,
      page: body.page !== undefined ? String(body.page) : undefined,
    });
    await syncCmsStateOnR2Update(oldKey, {
      r2Key: updated.r2Key,
      cdnUrl: updated.cdnUrl,
      alt: updated.alt,
      title: updated.title,
    });
    const objects = await listR2Objects();
    return NextResponse.json({
      ok: true,
      object: updated,
      r2Key: updated.r2Key,
      cdnUrl: updated.cdnUrl,
      objects,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update R2 object';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const keyParam = req.nextUrl.searchParams.get('key') || req.nextUrl.searchParams.get('r2Key');
    let keyToDelete = keyParam || '';
    if (!keyToDelete) {
      try {
        const body = await req.json();
        keyToDelete = String(body.r2Key || body.key || body.cdnUrl || '');
      } catch {
        // ignore empty body
      }
    }
    if (!keyToDelete) {
      return NextResponse.json(
        { error: 'r2Key is required to delete from R2 bucket' },
        { status: 400 }
      );
    }

    const result = await deleteR2Object(keyToDelete);
    await syncCmsStateOnR2Delete(result.deletedKey);
    const objects = await listR2Objects();
    return NextResponse.json({
      ok: true,
      deletedKey: result.deletedKey,
      objects,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete R2 object';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
