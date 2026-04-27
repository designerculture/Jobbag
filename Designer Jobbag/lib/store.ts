// Designer Jobbag System - Data Store (localStorage)

export type TicketStatus = 'New' | 'In Progress' | 'Pending' | 'Review' | 'Done'
export type DesignerStatus = 'Not Review' | 'Review' | 'Approved By Manager'
export type RequestType = 'Design' | 'Multimedia' | 'Bundle Request'

export interface TimelineEvent {
  action: string
  timestamp: string
  actor?: string
}

export interface Ticket {
  id: string
  ticketNumber: string
  fullName: string
  email: string
  emailOptional1?: string
  emailOptional2?: string
  initials: string
  department: string
  title: string
  description: string
  requestType: RequestType
  category: string       // single for Design/Multimedia
  categories?: string[]  // multi for Bundle Request
  linkReference?: string
  attachmentName?: string
  attachmentData?: string
  attachmentDriveUrl?: string
  attachmentName2?: string
  attachmentData2?: string
  attachmentDriveUrl2?: string
  attachmentName3?: string
  attachmentData3?: string
  attachmentDriveUrl3?: string
  // Deadline fields based on requestType
  deadline: string          // Design Deadline / Event Date / Target Date
  prepDate?: string         // Bundle Request only: Prep Date
  status: TicketStatus
  designerStatus: DesignerStatus
  assignedDesigner?: string    // primary / single designer
  assignedDesigners?: string[] // multi-designer (Multimedia & Bundle)
  designerNotes?: string
  feedback?: string
  createdAt: string
  updatedAt: string
  timeline?: TimelineEvent[]
}

const TICKETS_KEY = 'djs_tickets'

export const generateTicketNumber = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'DSG_'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const ticketStore = {
  getAll: (): Ticket[] => {
    try {
      const raw = localStorage.getItem(TICKETS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  getById: (id: string): Ticket | undefined => {
    return ticketStore.getAll().find(t => t.id === id)
  },

  create: (data: Omit<Ticket, 'id' | 'ticketNumber' | 'status' | 'designerStatus' | 'createdAt' | 'updatedAt' | 'timeline'>): Ticket => {
    const all = ticketStore.getAll()
    const now = new Date().toISOString()
    const ticket: Ticket = {
      ...data,
      id: crypto.randomUUID(),
      ticketNumber: generateTicketNumber(),
      status: 'New',
      designerStatus: 'Not Review',
      createdAt: now,
      updatedAt: now,
      timeline: [{ action: 'Jobbag Submitted', timestamp: now, actor: data.fullName }],
    }
    all.push(ticket)
    localStorage.setItem(TICKETS_KEY, JSON.stringify(all))
    return ticket
  },

  update: (id: string, updates: Partial<Ticket>, timelineEvent?: TimelineEvent): Ticket | null => {
    const all = ticketStore.getAll()
    const idx = all.findIndex(t => t.id === id)
    if (idx === -1) return null
    const existing = all[idx]
    const existingTimeline = existing.timeline || []
    all[idx] = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      timeline: timelineEvent ? [...existingTimeline, timelineEvent] : existingTimeline,
    }
    localStorage.setItem(TICKETS_KEY, JSON.stringify(all))
    return all[idx]
  },

  delete: (id: string): boolean => {
    const all = ticketStore.getAll()
    const filtered = all.filter(t => t.id !== id)
    if (filtered.length === all.length) return false
    localStorage.setItem(TICKETS_KEY, JSON.stringify(filtered))
    return true
  },

  getByDesigner: (name: string): Ticket[] => {
    return ticketStore.getAll().filter(t =>
      t.assignedDesigner === name ||
      (t.assignedDesigners || []).includes(name)
    )
  },

  // Upsert: insert jika belum ada, update jika sudah ada (berdasarkan ticketNumber)
  upsert: (ticket: Ticket): void => {
    const all = ticketStore.getAll()
    const idx = all.findIndex(t => t.ticketNumber === ticket.ticketNumber)
    if (idx === -1) {
      all.push({ ...ticket, id: ticket.id || ticket.ticketNumber })
    } else {
      all[idx] = { ...all[idx], ...ticket, id: all[idx].id }
    }
    localStorage.setItem(TICKETS_KEY, JSON.stringify(all))
  },
}

export const DESIGNERS = [
  'Fitra Pranadjaja',
  'Cindy Rizky Beauty',
  'Viditya Pradipta',
  'Akmalia Dwi Setyorini',
  'Donie Setya Nugraha',
  'Putrilda Asha Sofia',
  'Febrian Burhan',
]

export const DISPATCHERS: { username: string; password: string; name: string; role: 'dispatcher' | 'manager' }[] = [
  { username: 'FPA',    password: 'aabdesign7.',   name: 'Dispatcher FPA', role: 'dispatcher' },
  { username: 'DHG',    password: 'Lantai7.',       name: 'Dispatcher DHG', role: 'dispatcher' },
  { username: 'JOBMGR', password: 'designeraab25.', name: 'Jobbag Manager', role: 'manager' },
]

// Design categories
export const DESIGN_CATEGORIES = [
  'Poster',
  'Digital Banner Sosmed',
  'Cover Reels',
  'E-Blast',
  'Event Campaign Asset',
  'Publication Design',
  'Guideline Material',
  'Carousel Post',
  'Create Logo',
  'Souvenir Merchandise',
  'Create Icon Set',
]

// Multimedia categories
export const MULTIMEDIA_CATEGORIES = [
  'Photo Documentation',
  'Photo Retouching',
  'Digital Imaging',
  'Video Editing',
  'Shooting Content Reels',
  'Event Virtual Studio',
  'Event Virtual Hybrid',
  'Event Documentation Coverage',
  'Photoshoot Office',
  'Photoshoot Outdoor',
  'Event Setup (Self-Service)',
  'Audio Recording',
]

// All categories combined for Bundle
export const BUNDLE_CATEGORIES = [...DESIGN_CATEGORIES, ...MULTIMEDIA_CATEGORIES]

// Legacy (used elsewhere)
export const CATEGORIES = [...DESIGN_CATEGORIES, ...MULTIMEDIA_CATEGORIES]

export const STATUS_COLORS: Record<TicketStatus, string> = {
  'New': 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  'Pending': 'bg-orange-100 text-orange-700',
  'Review': 'bg-purple-100 text-purple-700',
  'Done': 'bg-green-100 text-green-700',
}

export const DESIGNER_STATUS_COLORS: Record<DesignerStatus, string> = {
  'Not Review': 'bg-gray-100 text-gray-600',
  'Review': 'bg-purple-100 text-purple-700',
  'Approved By Manager': 'bg-green-100 text-green-700',
}

export const REQUEST_TYPE_COLORS: Record<RequestType, string> = {
  'Design': 'bg-blue-100 text-blue-700',
  'Multimedia': 'bg-orange-100 text-orange-700',
  'Bundle Request': 'bg-purple-100 text-purple-700',
}
