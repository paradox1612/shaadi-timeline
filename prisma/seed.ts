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

  console.log("\n✅ Seed data created successfully!")
  console.log("\n📋 Test Credentials:")
  console.log("   Bride: bride@example.com / password123")
  console.log("   Groom: groom@example.com / password123")
  console.log("   Planner: planner@example.com / password123")
  console.log("   Vendor: vendor@example.com / password123")
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
