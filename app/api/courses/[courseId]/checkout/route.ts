import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'

const jsonError = (msg: string, status = 400) =>
  new NextResponse(msg, { status })

export async function POST(
  _req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    /* 1 — Auth */
    const user = await currentUser()
    if (!user || !user.id || !user.emailAddresses?.[0]?.emailAddress) {
      return jsonError('Unauthorized', 401)
    }

    /* 2 — Curso */
    const course = await db.course.findUnique({
      where: { id: params.courseId, isPublished: true }
    })
    if (!course) return jsonError('Course not found', 404)
    if (!course.price || course.price <= 0) {
      return jsonError('Course price not set', 400)
    }

    /* 3 — ¿Compra previa? */
    const already = await db.purchase.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: params.courseId } }
    })
    if (already) return jsonError('Already purchased', 400)

    /* 4 — Cliente Stripe en caché */
    let stripeCustomer = await db.stripeCustomer.findUnique({
      where: { userid: user.id },
      select: { stripeCustomerId: true }
    })
    if (!stripeCustomer) {
      const c = await stripe.customers.create({
        email: user.emailAddresses[0].emailAddress
      })
      stripeCustomer = await db.stripeCustomer.create({
        data: { userid: user.id, stripeCustomerId: c.id }
      })
    }

    /* 5 — Ítems */
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: 'USD',
          unit_amount: Math.round(course.price * 100),
          product_data: {
            name: course.title,
            ...(course.description && { description: course.description })
          }
        }
      }
    ]

    /* 6 — URLs */
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
      /* eslint-disable-next-line no-console */
      console.error('[CHECKOUT_ERROR] Falta NEXT_PUBLIC_APP_URL')
      return jsonError('Server misconfigured', 500)
    }

    /* 7 — Sesión */
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.stripeCustomerId,
      line_items,
      mode: 'payment',
      success_url: `${baseUrl}/courses/${course.id}?success=1`,
      cancel_url: `${baseUrl}/courses/${course.id}?cancelled=1`,
      metadata: { courseId: course.id, userId: user.id }
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[COURSE_CHECKOUT_ERROR]', error)
    if (error instanceof Stripe.errors.StripeError) {
      return jsonError(error.message, 400)
    }
    return jsonError('Internal server error', 500)
  }
}
