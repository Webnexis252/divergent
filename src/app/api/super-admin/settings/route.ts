import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPER_ADMIN']);
    if (!auth) return apiForbidden('Super Admin access required');

    let settings = await prisma.instituteSettings.findFirst();
    if (!settings) {
      settings = await prisma.instituteSettings.create({ data: {} });
    }

    return apiSuccess(settings);
  } catch (err) {
    console.error('[SETTINGS_GET_ERROR]', err);
    return apiServerError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPER_ADMIN']);
    if (!auth) return apiForbidden('Super Admin access required');

    const body = await req.json();
    const data = { ...body } as Record<string, unknown>;
    delete data.id;
    delete data.updatedAt;

    let settings = await prisma.instituteSettings.findFirst();

    if (settings) {
      settings = await prisma.instituteSettings.update({ where: { id: settings.id }, data });
    } else {
      settings = await prisma.instituteSettings.create({ data });
    }

    return apiSuccess(settings, 'Settings updated');
  } catch (err) {
    console.error('[SETTINGS_PATCH_ERROR]', err);
    return apiServerError();
  }
}
