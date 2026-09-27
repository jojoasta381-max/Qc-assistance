import { NextRequest } from 'next/server';
import { resolveTenant } from '@/lib/tenant-resolver';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-v1-response';

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const projects = await prisma.project.findMany({
      where: { tenantId: tenant.id },
      include: {
        _count: { select: { documents: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return apiSuccess({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
        document_count: p._count.documents,
      })),
    });
  } catch (err: any) {
    return apiError('PROJECTS_FETCH_FAILED', err.message || 'Failed to list projects', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant(req);
    const body = await req.json().catch(() => ({}));
    const { name, description } = body;

    if (!name) {
      return apiError('VALIDATION_ERROR', 'Project name is required.', 400);
    }

    const project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        name,
        description: description || null,
        status: 'ACTIVE',
      },
    });

    return apiSuccess({ project }, 201);
  } catch (err: any) {
    return apiError('PROJECT_CREATION_FAILED', err.message || 'Failed to create project', 400);
  }
}
