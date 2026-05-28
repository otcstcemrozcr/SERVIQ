---
name: serviq-master-prompt
description: Master architecture prompt for SERVIQ — the AI-native field service operations module of OpenOps AI / OneOpenERP. Saved verbatim on 2026-05-28 to anchor all future SERVIQ design decisions.
metadata: 
  node_type: memory
  type: project
  originSessionId: 20731a82-269b-4204-ab84-a181532ed044
---

Saved on 2026-05-28. This is the canonical brief the user wants every SERVIQ planning/implementation session to be measured against. Do not rewrite or paraphrase — reread this when scoping SERVIQ work.

**Why:** The user pasted this as the official project prompt and explicitly asked it be stored. It defines vision, scope, modules, data model, API surface, frontend requirements, UX principles, and the "analyze before code" rule.

**How to apply:** Before writing or proposing SERVIQ code, check the request against (a) the listed required modules 1–9, (b) the suggested data model, (c) the API/frontend lists, and (d) the "analyze first, code after approval" rule.

---

# Master Prompt (verbatim)

You are a senior full-stack SaaS architect and AI software engineer.

Project context:
We are building OpenOps AI / OneOpenERP. The new module is called SERVIQ.

SERVIQ is not just a simple service ticket module.
It must become an AI-native field service operations platform for enterprise after-sales service teams.

Main vision:
SERVIQ should digitalize field service operations end-to-end:
- work orders
- technician mobile workflow
- customer details
- material usage
- returned material tracking
- time tracking
- digital signature
- payment collection
- service report generation
- email delivery
- future ERP/SAP synchronization
- future AI technician assistant
- future predictive maintenance

Important:
Before modifying any files, first analyze the existing codebase and produce a clear implementation plan.
Do not write code until approval is given.

Business problem:
Many service teams still work with WhatsApp, Excel, paper service forms, manual signatures, manual payment tracking, and delayed ERP entries.
SERVIQ must replace this with a mobile-first, ERP-ready, AI-ready digital workflow.

Core user:
Field technician using tablet or phone.

Enterprise users:
- service manager
- back office
- finance team
- warehouse team
- customer service team

Required modules:

1. SERVIQ CORE
- Work order management
- Technician assignment
- Customer card
- Machine/equipment information
- Serial number support
- Warranty status
- Visit notes
- Service status flow:
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED

2. MATERIAL MANAGEMENT
Each work order must track materials:
- productId
- material code
- material name
- quantity
- unit
- status:
  USED
  RETURNED
- warehouse/location reference
- optional serial number
- optional batch number

Important:
USED means consumed at customer site.
RETURNED means technician brought it back or it should return to warehouse.

3. TIME TRACKING
Track:
- arrival time
- departure time
- labor hours
- travel hours
- waiting time if useful
- technician comment

4. DIGITAL SIGNATURE
Support:
- customer signature
- technician signature
- mobile/touch friendly signature pad
- store signature as image/base64/url depending on current project architecture
- final service report must include signatures

5. PAYMENT FLOW
Support:
- current account customer
- cash
- credit card
- virtual POS / iyzico abstraction
- transactionId
- paid/unpaid status

Rule:
If customer is not current account, payment modal should appear before completing the order.

6. SERVICE REPORT
When work order is completed:
- generate digital service report
- include customer, technician, materials, time, notes, signatures, payment status
- prepare future PDF generation
- trigger email sending abstraction

7. OFFLINE-FIRST / FIELD READY ARCHITECTURE
Design the module so it can later support:
- local cache
- offline work order editing
- offline signature
- sync queue
- conflict handling
- mobile poor internet scenarios

Do not fully implement offline mode unless project structure supports it, but design the architecture accordingly.

8. AI TECHNICIAN ASSISTANT READY
Design future extension points for:
- voice-to-service-report
- automatic service summary
- fault diagnosis
- recommended parts
- next maintenance recommendation
- customer email draft
- ERP notification text generation
- predictive maintenance

Do not implement full AI yet.
Prepare clean architecture for future AI services.

9. ERP / SAP READY
Design future integration layer for:
- SAP service order
- SAP notification
- material consumption
- goods issue / return
- customer master
- equipment master
- invoice/payment status
- e-invoice/e-archive compatibility
- Logo / Mikro / Netsis future adapters

Use adapter-based architecture where possible.

Suggested data model concepts:
- ServiceOrder
- WorkOrderMaterial
- TimeTracking
- Signature
- PaymentDetails
- Customer
- Technician
- Equipment
- ServiceReport
- ERPIntegrationStatus

Suggested API routes:
- GET /api/serviq/work-orders
- POST /api/serviq/work-orders
- GET /api/serviq/work-orders/[id]
- PUT /api/serviq/work-orders/[id]
- POST /api/serviq/work-orders/[id]/complete
- POST /api/serviq/payment
- POST /api/serviq/email
- future: POST /api/serviq/erp/sync
- future: POST /api/serviq/ai/service-summary

Frontend requirements:
Create or propose:
- dashboard SERVIQ menu
- work order list page
- work order detail page
- mobile-first technician view
- customer card at top
- equipment card
- material section
- USED / RETURNED toggle
- time tracking section
- notes section
- signature section
- payment modal
- completion button
- status badge

Components:
- SignaturePad
- PaymentModal
- MaterialUsageTable
- TimeTrackingForm
- CustomerCard
- EquipmentCard
- ServiceStatusBadge
- WorkOrderMobileShell

UX principle:
Technician should be able to complete the whole visit from a phone with minimum typing.

Technical expectations:
- TypeScript
- clean folder structure
- reusable components
- mobile-first responsive UI
- type-safe models
- validation if current stack supports it
- no hardcoded secrets
- no direct payment provider lock-in
- no direct SAP lock-in
- adapter/service-layer pattern
- scalable enterprise architecture

First task:
Analyze the existing codebase.

Your first response must include:
1. detected tech stack
2. existing folder structure summary
3. current architecture observations
4. recommended SERVIQ folder structure
5. exact files to create
6. exact files to modify
7. database/model recommendation
8. API design
9. frontend screen design
10. implementation phases
11. risks and open questions
12. confirmation request before coding

Very important:
DO NOT MODIFY FILES YET.
Only analyze and plan.
