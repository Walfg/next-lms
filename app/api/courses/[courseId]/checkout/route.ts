import { currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'

// Utilidad para responder con JSON de error
const jsonError = (msg: string, status = 400) =>
  new NextResponse(msg, { status })

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    /* 1 — Autenticación */
    const user = await currentUser()
    if (!user || !user.id || !user.emailAddresses?.[0]?.emailAddress) {
      return jsonError('Unauthorized', 401)
    }

    /* 2 — Curso */
    const course = await db.course.findUnique({
      where: { id: params.courseId, isPublished: true }
    })
    if (!course) {
      return jsonError('Course not found', 404)
    }
    if (!course.price || course.price <= 0) {
      return jsonError('Course price not set', 400)
    }

    /* 3 — Compra previa */
    const alreadyBought = await db.purchase.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId: params.courseId }
      }
    })
    if (alreadyBought) {
      return jsonError('Already purchased', 400)
    }

    /* 4 — Cliente de Stripe (cacheado en BD) */
    let stripeCustomer = await db.stripeCustomer.findUnique({
      where: { userid: user.id },
      select: { stripeCustomerId: true }
    })
    if (!stripeCustomer) {
      const customer = await stripe.customers.create({
        email: user.emailAddresses[0].emailAddress
      })
      stripeCustomer = await db.stripeCustomer.create({
        data: { userid: user.id, stripeCustomerId: customer.id }
      })
    }

    /* 5 — Líneas de carrito */
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

    /* 6 — URLs de retorno */
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
      console.error('[CHECKOUT_ERROR] Falta NEXT_PUBLIC_APP_URL')
      return jsonError('Server misconfigured', 500)
    }

    /* 7 — Crear sesión de pago */
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.stripeCustomerId,
      line_items,
      mode: 'payment',
      success_url: `${baseUrl}/courses/${course.id}?success=1`,
      cancel_url: `${baseUrl}/courses/${course.id}?cancelled=1`,
      metadata: {
        courseId: course.id,
        userId: user.id
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    // LOG detallado para depurar en Vercel
    console.error('[COURSE_CHECKOUT_ERROR]', error)

    // Respuesta según tipo de error
    if (error instanceof Stripe.errors.StripeError) {
      return jsonError(error.message, 400)
    }
    return jsonError('Internal server error', 500)
  }
}
