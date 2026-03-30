import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessAdminPanel, canAccessSanctionsByRole } from "@/lib/discord-staff-roles";
import { prisma } from "@/lib/prisma";

type CreateCategoryBody = {
  name?: string;
};

type UpdateCategoryBody = {
  id?: string;
  name?: string;
};

type DeleteCategoryBody = {
  id?: string;
};

async function canReadPolicies() {
  const session = await getServerSession(authOptions);
  return canAccessSanctionsByRole(session?.user?.staffRole ?? null);
}

async function canManagePolicies() {
  const session = await getServerSession(authOptions);
  return canAccessAdminPanel(session?.user?.staffRole ?? null);
}

export async function GET() {
  const authorized = await canReadPolicies();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const categoryDelegate = (prisma as unknown as {
      sanctionPolicyCategory?: {
        findMany: (args: {
          where: { isActive: boolean };
          orderBy: Array<{ sortOrder: "asc" } | { name: "asc" }>;
          select: {
            id: true;
            name: true;
            sortOrder: true;
            infractions: {
              where: { isActive: boolean };
              orderBy: Array<{ sortOrder: "asc" } | { createdAt: "asc" }>;
              select: {
                id: true;
                fault: true;
                sanction: true;
                tags: true;
                sortOrder: true;
              };
            };
          };
        }) => Promise<
          Array<{
            id: string;
            name: string;
            sortOrder: number;
            infractions: Array<{
              id: string;
              fault: string;
              sanction: string;
              tags: string[];
              sortOrder: number;
            }>;
          }>
        >;
      };
    }).sanctionPolicyCategory;

    if (!categoryDelegate?.findMany) {
      return NextResponse.json({ categories: [] });
    }

    const categories = await categoryDelegate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        sortOrder: true,
        infractions: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            fault: true,
            sanction: true,
            tags: true,
            sortOrder: true,
          },
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorized = await canManagePolicies();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateCategoryBody;
  try {
    body = (await request.json()) as CreateCategoryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const categoryDelegate = (prisma as unknown as {
      sanctionPolicyCategory?: {
        count: (args: { where: { isActive: boolean } }) => Promise<number>;
        create: (args: {
          data: { name: string; sortOrder: number; isActive: boolean };
          select: { id: true; name: true; sortOrder: true };
        }) => Promise<{ id: string; name: string; sortOrder: number }>;
      };
    }).sanctionPolicyCategory;

    if (!categoryDelegate?.create || !categoryDelegate.count) {
      return NextResponse.json({ error: "Model not available" }, { status: 500 });
    }

    const count = await categoryDelegate.count({ where: { isActive: true } });
    const created = await categoryDelegate.create({
      data: {
        name,
        sortOrder: count + 1,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ ok: true, category: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authorized = await canManagePolicies();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UpdateCategoryBody;
  try {
    body = (await request.json()) as UpdateCategoryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const id = body.id?.trim();
  const name = body.name?.trim();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const categoryDelegate = (prisma as unknown as {
      sanctionPolicyCategory?: {
        update: (args: {
          where: { id: string };
          data: { name: string };
        }) => Promise<unknown>;
      };
    }).sanctionPolicyCategory;

    if (!categoryDelegate?.update) {
      return NextResponse.json({ error: "Model not available" }, { status: 500 });
    }

    await categoryDelegate.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authorized = await canManagePolicies();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: DeleteCategoryBody;
  try {
    body = (await request.json()) as DeleteCategoryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const id = body.id?.trim();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const categoryDelegate = (prisma as unknown as {
      sanctionPolicyCategory?: {
        update: (args: {
          where: { id: string };
          data: { isActive: boolean };
        }) => Promise<unknown>;
      };
      sanctionPolicyInfraction?: {
        updateMany: (args: {
          where: { categoryId: string };
          data: { isActive: boolean };
        }) => Promise<unknown>;
      };
    });

    if (!categoryDelegate.sanctionPolicyCategory?.update) {
      return NextResponse.json({ error: "Model not available" }, { status: 500 });
    }

    if (categoryDelegate.sanctionPolicyInfraction?.updateMany) {
      await categoryDelegate.sanctionPolicyInfraction.updateMany({
        where: { categoryId: id },
        data: { isActive: false },
      });
    }

    await categoryDelegate.sanctionPolicyCategory.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
