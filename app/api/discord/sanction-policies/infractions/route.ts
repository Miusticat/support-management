import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/discord-staff-roles";
import { prisma } from "@/lib/prisma";

type CreateInfractionBody = {
  categoryId?: string;
  fault?: string;
  sanction?: string;
  tags?: string[];
};

type UpdateInfractionBody = {
  id?: string;
  fault?: string;
  sanction?: string;
  tags?: string[];
};

type DeleteInfractionBody = {
  id?: string;
};

function parseTags(value: string[] | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((item) => item.trim()).filter(Boolean)));
}

async function canManagePolicies() {
  const session = await getServerSession(authOptions);
  return canAccessAdminPanel(session?.user?.staffRole ?? null);
}

export async function POST(request: Request) {
  const authorized = await canManagePolicies();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateInfractionBody;
  try {
    body = (await request.json()) as CreateInfractionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const categoryId = body.categoryId?.trim();
  const fault = body.fault?.trim();
  const sanction = body.sanction?.trim();
  const tags = parseTags(body.tags);

  if (!categoryId || !fault || !sanction) {
    return NextResponse.json(
      { error: "categoryId, fault and sanction are required" },
      { status: 400 }
    );
  }

  try {
    const delegate = (prisma as unknown as {
      sanctionPolicyInfraction?: {
        count: (args: { where: { categoryId: string; isActive: boolean } }) => Promise<number>;
        create: (args: {
          data: {
            categoryId: string;
            fault: string;
            sanction: string;
            tags: string[];
            sortOrder: number;
            isActive: boolean;
          };
          select: {
            id: true;
            fault: true;
            sanction: true;
            tags: true;
            sortOrder: true;
          };
        }) => Promise<{
          id: string;
          fault: string;
          sanction: string;
          tags: string[];
          sortOrder: number;
        }>;
      };
    }).sanctionPolicyInfraction;

    if (!delegate?.create || !delegate.count) {
      return NextResponse.json({ error: "Model not available" }, { status: 500 });
    }

    const count = await delegate.count({ where: { categoryId, isActive: true } });

    const created = await delegate.create({
      data: {
        categoryId,
        fault,
        sanction,
        tags,
        sortOrder: count + 1,
        isActive: true,
      },
      select: {
        id: true,
        fault: true,
        sanction: true,
        tags: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ ok: true, infraction: created });
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

  let body: UpdateInfractionBody;
  try {
    body = (await request.json()) as UpdateInfractionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const id = body.id?.trim();
  const fault = body.fault?.trim();
  const sanction = body.sanction?.trim();
  const tags = parseTags(body.tags);

  if (!id || !fault || !sanction) {
    return NextResponse.json(
      { error: "id, fault and sanction are required" },
      { status: 400 }
    );
  }

  try {
    const delegate = (prisma as unknown as {
      sanctionPolicyInfraction?: {
        update: (args: {
          where: { id: string };
          data: {
            fault: string;
            sanction: string;
            tags: string[];
          };
        }) => Promise<unknown>;
      };
    }).sanctionPolicyInfraction;

    if (!delegate?.update) {
      return NextResponse.json({ error: "Model not available" }, { status: 500 });
    }

    await delegate.update({
      where: { id },
      data: {
        fault,
        sanction,
        tags,
      },
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

  let body: DeleteInfractionBody;
  try {
    body = (await request.json()) as DeleteInfractionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const id = body.id?.trim();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const delegate = (prisma as unknown as {
      sanctionPolicyInfraction?: {
        update: (args: {
          where: { id: string };
          data: { isActive: boolean };
        }) => Promise<unknown>;
      };
    }).sanctionPolicyInfraction;

    if (!delegate?.update) {
      return NextResponse.json({ error: "Model not available" }, { status: 500 });
    }

    await delegate.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
