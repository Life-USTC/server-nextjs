import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateCalendarSubscriptionJWT } from "@/lib/calendar-jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Find the most recent subscription for this user
  const subscription = await prisma.calendarSubscription.findFirst({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      id: "desc",
    },
    include: {
      sections: true,
    },
  });

  if (!subscription) {
    return NextResponse.json({ subscription: null });
  }

  // Generate a token for this subscription so the client can use it for updates if needed
  // although mostly they should just use the user session if we updated the API.
  // But for compatibility with existing client code which might send Authorization: Bearer [token]
  // we can return a token.
  const token = await generateCalendarSubscriptionJWT(subscription.id);

  return NextResponse.json({
    subscription,
    token,
  });
}
