import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create admin user from env or defaults
  const adminEmail = process.env.ADMIN_EMAIL || "admin"
  const adminPassword = process.env.ADMIN_PASSWORD || "pass123"
  const adminName = process.env.ADMIN_NAME || "Admin"

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10)
    const admin = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash: hashedAdminPassword,
        role: "PLANNER",
      },
    })
    console.log("Created admin user:", admin.email)
  } else {
    console.log("Admin user already exists:", adminEmail)
  }

  // Check if demo data already exists
  const existingWedding = await prisma.wedding.findFirst()
  if (existingWedding) {
    console.log("Demo data already exists, skipping...")
    return
  }

  // Create wedding
  const wedding = await prisma.wedding.create({
    data: {
      name: "Priya & Rahul's Wedding",
      locationCity: "Houston, TX",
      timezone: "America/Chicago",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-02-05"),
    },
  })
  console.log("Created wedding:", wedding.name)

  // Create users
  const hashedPassword = await bcrypt.hash("password123", 10)

  const bride = await prisma.user.create({
    data: {
      name: "Priya Sharma",
      email: "bride@example.com",
      passwordHash: hashedPassword,
      role: "BRIDE",
    },
  })
  console.log("Created bride:", bride.email)

  const groom = await prisma.user.create({
    data: {
      name: "Rahul Patel",
      email: "groom@example.com",
      passwordHash: hashedPassword,
      role: "GROOM",
    },
  })
  console.log("Created groom:", groom.email)

  const planner = await prisma.user.create({
    data: {
      name: "Wedding Planner",
      email: "planner@example.com",
      passwordHash: hashedPassword,
      role: "PLANNER",
    },
  })
  console.log("Created planner:", planner.email)

  // Create parent users
  const brideParent = await prisma.user.create({
    data: {
      name: "Mrs. Sharma",
      email: "bride-parent@example.com",
      passwordHash: hashedPassword,
      role: "BRIDE_PARENT",
      relationshipLabel: "Mother of the Bride",
    },
  })
  console.log("Created bride parent:", brideParent.email)

  const groomParent = await prisma.user.create({
    data: {
      name: "Mr. Patel",
      email: "groom-parent@example.com",
      passwordHash: hashedPassword,
      role: "GROOM_PARENT",
      relationshipLabel: "Father of the Groom",
    },
  })
  console.log("Created groom parent:", groomParent.email)

  // Create family helper user
  const familyHelper = await prisma.user.create({
    data: {
      name: "Anita Sharma",
      email: "helper@example.com",
      passwordHash: hashedPassword,
      role: "FAMILY_HELPER",
      relationshipLabel: "Sister of the Bride",
    },
  })
  console.log("Created family helper:", familyHelper.email)

  // Create vendor profiles
  const photographer = await prisma.vendorProfile.create({
    data: {
      weddingId: wedding.id,
      type: "PHOTOGRAPHER",
      companyName: "Capture Moments Photography",
      contactName: "Amit Kumar",
      email: "photographer@example.com",
      phone: "+1-555-0100",
      notes: "Award-winning South Asian wedding photographer",
    },
  })

  const videographer = await prisma.vendorProfile.create({
    data: {
      weddingId: wedding.id,
      type: "VIDEOGRAPHER",
      companyName: "Dream Films",
      contactName: "Neha Gupta",
      email: "videographer@example.com",
      phone: "+1-555-0101",
    },
  })

  const mua = await prisma.vendorProfile.create({
    data: {
      weddingId: wedding.id,
      type: "MUA",
      companyName: "Bridal Glow Studio",
      contactName: "Sonia Kapoor",
      email: "mua@example.com",
      phone: "+1-555-0102",
    },
  })

  const dj = await prisma.vendorProfile.create({
    data: {
      weddingId: wedding.id,
      type: "DJ",
      companyName: "DJ Beats",
      contactName: "Raj Singh",
      email: "dj@example.com",
      phone: "+1-555-0103",
    },
  })

  const decor = await prisma.vendorProfile.create({
    data: {
      weddingId: wedding.id,
      type: "DECOR",
      companyName: "Floral Dreams",
      contactName: "Maya Reddy",
      email: "decor@example.com",
      phone: "+1-555-0104",
    },
  })

  const caterer = await prisma.vendorProfile.create({
    data: {
      weddingId: wedding.id,
      type: "CATERER",
      companyName: "Spice Route Catering",
      contactName: "Chef Rajan",
      email: "caterer@example.com",
      phone: "+1-555-0105",
    },
  })

  console.log("Created vendor profiles")

  // Create vendor user (photographer)
  const vendorUser = await prisma.user.create({
    data: {
      name: "Amit Kumar",
      email: "vendor@example.com",
      passwordHash: hashedPassword,
      role: "VENDOR",
      vendorProfile: {
        connect: { id: photographer.id },
      },
    },
  })
  console.log("Created vendor user:", vendorUser.email)

  // Create event days
  const mehendi = await prisma.eventDay.create({
    data: {
      weddingId: wedding.id,
      date: new Date("2026-02-01"),
      label: "Mehendi",
      sortOrder: 0,
    },
  })

  const sangeet = await prisma.eventDay.create({
    data: {
      weddingId: wedding.id,
      date: new Date("2026-02-02"),
      label: "Sangeet",
      sortOrder: 1,
    },
  })

  const haldi = await prisma.eventDay.create({
    data: {
      weddingId: wedding.id,
      date: new Date("2026-02-03"),
      label: "Haldi",
      sortOrder: 2,
    },
  })

  const wedding_day = await prisma.eventDay.create({
    data: {
      weddingId: wedding.id,
      date: new Date("2026-02-04"),
      label: "Wedding Day",
      sortOrder: 3,
    },
  })

  const reception = await prisma.eventDay.create({
    data: {
      weddingId: wedding.id,
      date: new Date("2026-02-05"),
      label: "Reception",
      sortOrder: 4,
    },
  })

  console.log("Created event days")

  // Create timeline items for Mehendi
  await prisma.timelineItem.create({
    data: {
      eventDayId: mehendi.id,
      startTime: new Date("2026-02-01T14:00:00"),
      endTime: new Date("2026-02-01T15:00:00"),
      title: "Mehendi Artist Setup",
      locationName: "Venue - Garden Area",
      visibility: "INTERNAL",
      internalNotes: "Ensure tent is set up for shade",
      createdByUserId: planner.id,
      sortOrder: 0,
    },
  })

  await prisma.timelineItem.create({
    data: {
      eventDayId: mehendi.id,
      startTime: new Date("2026-02-01T15:00:00"),
      endTime: new Date("2026-02-01T20:00:00"),
      title: "Mehendi Ceremony",
      locationName: "Venue - Garden Area",
      visibility: "AUDIENCE",
      audienceNotes: "Please arrive by 2:45 PM. Light snacks will be served.",
      vendorNotes: "Capture candid moments of mehendi application",
      createdByUserId: planner.id,
      sortOrder: 1,
      assignedVendors: {
        create: [
          { vendorProfileId: photographer.id },
          { vendorProfileId: videographer.id },
        ],
      },
    },
  })

  // Create timeline items for Sangeet
  await prisma.timelineItem.create({
    data: {
      eventDayId: sangeet.id,
      startTime: new Date("2026-02-02T16:00:00"),
      endTime: new Date("2026-02-02T17:00:00"),
      title: "Bride Getting Ready",
      locationName: "Bridal Suite",
      visibility: "VENDOR",
      vendorNotes: "Getting ready shots - natural lighting preferred",
      createdByUserId: planner.id,
      sortOrder: 0,
      assignedVendors: {
        create: [
          { vendorProfileId: photographer.id },
          { vendorProfileId: mua.id },
        ],
      },
    },
  })

  await prisma.timelineItem.create({
    data: {
      eventDayId: sangeet.id,
      startTime: new Date("2026-02-02T18:00:00"),
      endTime: new Date("2026-02-02T23:00:00"),
      title: "Sangeet Night",
      locationName: "Grand Ballroom",
      visibility: "AUDIENCE",
      audienceNotes: "Join us for a night of music, dance, and celebration!",
      vendorNotes: "Performance schedule will be shared separately. Capture all performances.",
      createdByUserId: planner.id,
      sortOrder: 1,
      assignedVendors: {
        create: [
          { vendorProfileId: photographer.id },
          { vendorProfileId: videographer.id },
          { vendorProfileId: dj.id },
          { vendorProfileId: decor.id },
        ],
      },
    },
  })

  // Create timeline items for Wedding Day
  await prisma.timelineItem.create({
    data: {
      eventDayId: wedding_day.id,
      startTime: new Date("2026-02-04T06:00:00"),
      endTime: new Date("2026-02-04T09:00:00"),
      title: "Bride Getting Ready",
      locationName: "Bridal Suite",
      visibility: "VENDOR",
      vendorNotes: "Full bridal makeup and styling. Allow time for detail shots.",
      createdByUserId: planner.id,
      sortOrder: 0,
      assignedVendors: {
        create: [
          { vendorProfileId: photographer.id },
          { vendorProfileId: mua.id },
        ],
      },
    },
  })

  await prisma.timelineItem.create({
    data: {
      eventDayId: wedding_day.id,
      startTime: new Date("2026-02-04T09:30:00"),
      endTime: new Date("2026-02-04T10:30:00"),
      title: "Baraat Procession",
      locationName: "Hotel Entrance",
      visibility: "AUDIENCE",
      audienceNotes: "Join us for the grand arrival of the groom! Dancing encouraged!",
      vendorNotes: "High energy - capture the dancing and arrival",
      createdByUserId: planner.id,
      sortOrder: 1,
      assignedVendors: {
        create: [
          { vendorProfileId: photographer.id },
          { vendorProfileId: videographer.id },
          { vendorProfileId: dj.id },
        ],
      },
    },
  })

  await prisma.timelineItem.create({
    data: {
      eventDayId: wedding_day.id,
      startTime: new Date("2026-02-04T11:00:00"),
      endTime: new Date("2026-02-04T14:00:00"),
      title: "Wedding Ceremony",
      locationName: "Mandap - Grand Ballroom",
      visibility: "AUDIENCE",
      audienceNotes: "The main ceremony. Please be seated by 10:45 AM.",
      vendorNotes: "Key moments: Varmala, Pheras, Sindoor, Mangalsutra. Coordinate with pandit.",
      createdByUserId: planner.id,
      sortOrder: 2,
      assignedVendors: {
        create: [
          { vendorProfileId: photographer.id },
          { vendorProfileId: videographer.id },
          { vendorProfileId: decor.id },
        ],
      },
    },
  })

  await prisma.timelineItem.create({
    data: {
      eventDayId: wedding_day.id,
      startTime: new Date("2026-02-04T14:00:00"),
      endTime: new Date("2026-02-04T16:00:00"),
      title: "Wedding Lunch",
      locationName: "Dining Hall",
      visibility: "AUDIENCE",
      audienceNotes: "Enjoy a delicious lunch spread!",
      createdByUserId: planner.id,
      sortOrder: 3,
    },
  })

  console.log("Created timeline items")

  // Create a guest link
  await prisma.guestViewLink.create({
    data: {
      weddingId: wedding.id,
      token: "sample-guest-link-token-12345",
      label: "All Guests",
      allowedEventDays: {
        create: [
          { eventDayId: mehendi.id },
          { eventDayId: sangeet.id },
          { eventDayId: haldi.id },
          { eventDayId: wedding_day.id },
          { eventDayId: reception.id },
        ],
      },
    },
  })

  await prisma.guestViewLink.create({
    data: {
      weddingId: wedding.id,
      token: "wedding-day-only-link",
      label: "Wedding Day Only",
      allowedEventDays: {
        create: [{ eventDayId: wedding_day.id }],
      },
    },
  })

  console.log("Created guest links")

  // Create default permission policy
  await prisma.permissionPolicy.create({
    data: {
      weddingId: wedding.id,
      permissions: {
        PLANNER: {
          "tasks.create": true,
          "tasks.edit_any": true,
          "tasks.edit_assigned": true,
          "tasks.view_private": false,
          "tasks.assign": true,
          "tasks.comment": true,
          "vendors.view": true,
          "vendors.manage": true,
          "quotes.view": true,
          "quotes.manage": true,
          "payments.create": true,
          "payments.approve": false,
          "payments.view_all": true,
          "payments.view_own": true,
        },
        BRIDE_PARENT: {
          "tasks.create": true,
          "tasks.edit_any": false,
          "tasks.edit_assigned": true,
          "tasks.view_private": false,
          "tasks.assign": false,
          "tasks.comment": true,
          "vendors.view": true,
          "vendors.manage": false,
          "quotes.view": true,
          "quotes.manage": false,
          "payments.create": false,
          "payments.approve": false,
          "payments.view_all": false,
          "payments.view_own": true,
        },
        GROOM_PARENT: {
          "tasks.create": true,
          "tasks.edit_any": false,
          "tasks.edit_assigned": true,
          "tasks.view_private": false,
          "tasks.assign": false,
          "tasks.comment": true,
          "vendors.view": true,
          "vendors.manage": false,
          "quotes.view": true,
          "quotes.manage": false,
          "payments.create": false,
          "payments.approve": false,
          "payments.view_all": false,
          "payments.view_own": true,
        },
        FAMILY_HELPER: {
          "tasks.create": true,
          "tasks.edit_any": false,
          "tasks.edit_assigned": true,
          "tasks.view_private": false,
          "tasks.assign": false,
          "tasks.comment": true,
          "vendors.view": true,
          "vendors.manage": false,
          "quotes.view": false,
          "quotes.manage": false,
          "payments.create": false,
          "payments.approve": false,
          "payments.view_all": false,
          "payments.view_own": false,
        },
        VENDOR: {
          "tasks.create": false,
          "tasks.edit_any": false,
          "tasks.edit_assigned": true,
          "tasks.view_private": false,
          "tasks.assign": false,
          "tasks.comment": true,
          "vendors.view": false,
          "vendors.manage": false,
          "quotes.view": true,
          "quotes.manage": false,
          "payments.create": false,
          "payments.approve": false,
          "payments.view_all": false,
          "payments.view_own": true,
        },
      },
    },
  })

  console.log("Created permission policy")

  // Create sample tasks
  // Private task (only bride/groom can see)
  await prisma.task.create({
    data: {
      weddingId: wedding.id,
      title: "Plan surprise for groom",
      description: "Coordinate with bridesmaids for a surprise performance during sangeet",
      status: "IN_PROGRESS",
      priority: "HIGH",
      visibility: "PRIVATE",
      dueDate: new Date("2026-01-25"),
      tags: ["surprise", "sangeet"],
      createdByUserId: bride.id,
    },
  })

  // Internal team task
  await prisma.task.create({
    data: {
      weddingId: wedding.id,
      title: "Finalize guest list",
      description: "Confirm final headcount with all family members",
      status: "TODO",
      priority: "CRITICAL",
      visibility: "INTERNAL_TEAM",
      dueDate: new Date("2026-01-15"),
      tags: ["guests", "urgent"],
      createdByUserId: planner.id,
      assignedToUserId: bride.id,
    },
  })

  // Parents visibility task
  await prisma.task.create({
    data: {
      weddingId: wedding.id,
      title: "Coordinate extended family accommodations",
      description: "Book hotel blocks and arrange transportation from airport",
      status: "TODO",
      priority: "MEDIUM",
      visibility: "PARENTS",
      dueDate: new Date("2026-01-20"),
      tags: ["travel", "family"],
      createdByUserId: bride.id,
      assignedToUserId: brideParent.id,
    },
  })

  // Vendor visibility task
  await prisma.task.create({
    data: {
      weddingId: wedding.id,
      eventDayId: wedding_day.id,
      vendorId: photographer.id,
      title: "Submit shot list for wedding ceremony",
      description: "Provide detailed shot list including must-have moments and family groupings",
      status: "TODO",
      priority: "HIGH",
      visibility: "VENDORS",
      dueDate: new Date("2026-01-28"),
      tags: ["photography", "planning"],
      createdByUserId: planner.id,
    },
  })

  // Everyone internal task
  await prisma.task.create({
    data: {
      weddingId: wedding.id,
      eventDayId: sangeet.id,
      title: "Finalize sangeet performance order",
      description: "Create and share the performance lineup for sangeet night",
      status: "IN_PROGRESS",
      priority: "HIGH",
      visibility: "EVERYONE_INTERNAL",
      dueDate: new Date("2026-01-30"),
      tags: ["sangeet", "performances"],
      createdByUserId: familyHelper.id,
      watchers: {
        create: [
          { userId: bride.id },
          { userId: groom.id },
        ],
      },
    },
  })

  // Completed task
  await prisma.task.create({
    data: {
      weddingId: wedding.id,
      title: "Book wedding venue",
      description: "Signed contract with Grand Houston Hotel",
      status: "DONE",
      priority: "CRITICAL",
      visibility: "INTERNAL_TEAM",
      tags: ["venue", "milestone"],
      createdByUserId: bride.id,
    },
  })

  console.log("Created sample tasks")

  // Create sample vendor quotes
  const photoQuote = await prisma.vendorQuote.create({
    data: {
      weddingId: wedding.id,
      vendorId: photographer.id,
      title: "Premium Photography Package",
      amountTotal: 8500,
      currency: "USD",
      notes: "Includes 2 photographers, engagement shoot, all edited photos, and wedding album",
      lineItems: [
        { description: "Wedding Day Coverage (12 hours)", amount: 5000, quantity: 1 },
        { description: "Engagement Shoot", amount: 1500, quantity: 1 },
        { description: "Premium Wedding Album", amount: 1500, quantity: 1 },
        { description: "Second Photographer", amount: 500, quantity: 1 },
      ],
      status: "ACCEPTED",
      createdByUserId: planner.id,
    },
  })

  const videoQuote = await prisma.vendorQuote.create({
    data: {
      weddingId: wedding.id,
      vendorId: videographer.id,
      title: "Cinematic Video Package",
      amountTotal: 6000,
      currency: "USD",
      notes: "Full day coverage with highlight reel and documentary edit",
      lineItems: [
        { description: "Full Day Coverage", amount: 4000, quantity: 1 },
        { description: "Highlight Reel (5-7 min)", amount: 1000, quantity: 1 },
        { description: "Documentary Edit (30-40 min)", amount: 1000, quantity: 1 },
      ],
      status: "ACCEPTED",
      createdByUserId: planner.id,
    },
  })

  const djQuote = await prisma.vendorQuote.create({
    data: {
      weddingId: wedding.id,
      vendorId: dj.id,
      title: "DJ & Sound Package",
      amountTotal: 3500,
      currency: "USD",
      notes: "Coverage for Sangeet and Reception",
      lineItems: [
        { description: "Sangeet Night (5 hours)", amount: 1500, quantity: 1 },
        { description: "Reception (5 hours)", amount: 1500, quantity: 1 },
        { description: "Premium Sound System", amount: 500, quantity: 1 },
      ],
      status: "SENT",
      createdByUserId: planner.id,
    },
  })

  const decorQuote = await prisma.vendorQuote.create({
    data: {
      weddingId: wedding.id,
      vendorId: decor.id,
      title: "Full Wedding Decor Package",
      amountTotal: 15000,
      currency: "USD",
      notes: "All 5 events - Mehendi, Sangeet, Haldi, Wedding, Reception",
      lineItems: [
        { description: "Mehendi Decor", amount: 2000, quantity: 1 },
        { description: "Sangeet Decor", amount: 3000, quantity: 1 },
        { description: "Haldi Decor", amount: 1500, quantity: 1 },
        { description: "Wedding Mandap & Hall", amount: 5000, quantity: 1 },
        { description: "Reception Decor", amount: 3500, quantity: 1 },
      ],
      status: "ACCEPTED",
      createdByUserId: bride.id,
    },
  })

  const cateringQuote = await prisma.vendorQuote.create({
    data: {
      weddingId: wedding.id,
      vendorId: caterer.id,
      title: "Full Catering Package (500 guests)",
      amountTotal: 45000,
      currency: "USD",
      notes: "All events - vegetarian and non-vegetarian options",
      lineItems: [
        { description: "Mehendi - Light Refreshments", amount: 5000, quantity: 1 },
        { description: "Sangeet - Dinner Buffet", amount: 10000, quantity: 1 },
        { description: "Haldi - Brunch", amount: 5000, quantity: 1 },
        { description: "Wedding - Lunch Feast", amount: 15000, quantity: 1 },
        { description: "Reception - Dinner Buffet", amount: 10000, quantity: 1 },
      ],
      status: "ACCEPTED",
      createdByUserId: bride.id,
    },
  })

  console.log("Created vendor quotes")

  // Create sample payments
  await prisma.payment.create({
    data: {
      weddingId: wedding.id,
      vendorId: photographer.id,
      quoteId: photoQuote.id,
      amount: 4250,
      currency: "USD",
      paidAt: new Date("2025-10-15"),
      method: "ZELLE",
      note: "50% deposit payment",
      createdByUserId: bride.id,
    },
  })

  await prisma.payment.create({
    data: {
      weddingId: wedding.id,
      vendorId: videographer.id,
      quoteId: videoQuote.id,
      amount: 2000,
      currency: "USD",
      paidAt: new Date("2025-11-01"),
      method: "BANK",
      note: "Initial deposit",
      createdByUserId: groom.id,
    },
  })

  await prisma.payment.create({
    data: {
      weddingId: wedding.id,
      vendorId: decor.id,
      quoteId: decorQuote.id,
      amount: 7500,
      currency: "USD",
      paidAt: new Date("2025-11-15"),
      method: "BANK",
      note: "50% deposit",
      createdByUserId: bride.id,
    },
  })

  await prisma.payment.create({
    data: {
      weddingId: wedding.id,
      vendorId: caterer.id,
      quoteId: cateringQuote.id,
      amount: 15000,
      currency: "USD",
      paidAt: new Date("2025-12-01"),
      method: "BANK",
      note: "First installment - 1/3",
      createdByUserId: bride.id,
    },
  })

  await prisma.payment.create({
    data: {
      weddingId: wedding.id,
      vendorId: caterer.id,
      quoteId: cateringQuote.id,
      amount: 15000,
      currency: "USD",
      paidAt: new Date("2026-01-01"),
      method: "BANK",
      note: "Second installment - 2/3",
      createdByUserId: groom.id,
    },
  })

  console.log("Created sample payments")

  console.log("\n✅ Seed data created successfully!")
  console.log("\n📋 Test Credentials:")
  console.log("   Bride: bride@example.com / password123")
  console.log("   Groom: groom@example.com / password123")
  console.log("   Planner: planner@example.com / password123")
  console.log("   Vendor: vendor@example.com / password123")
  console.log("   Bride Parent: bride-parent@example.com / password123")
  console.log("   Groom Parent: groom-parent@example.com / password123")
  console.log("   Family Helper: helper@example.com / password123")
  console.log("\n🔗 Guest Link: /guest/sample-guest-link-token-12345")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
