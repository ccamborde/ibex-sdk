# IBExSafe API Endpoints Reference

> Complete reference of all REST API endpoints exposed by the IBExSafe platform.
>
> **Base URLs:**
> - Production: `https://safe.ib.exchange`
> - Testnet: `https://safe-testnet.ib.exchange`
> - Staging: `https://safe-staging.ib.exchange`

---

## Changelog

- **2026-05-21** `add` `PATCH /iban/modify` — modify the label of an existing IBAN (label-only update)
- **2026-05-21** `modify` `POST /iban/add` — added optional `label` parameter (free-text, read-only for clients)
- **2026-05-21** `modify` `POST /validateSms` — added `dryRun` parameter (non-production only, skips Brevo, returns code)
- **2026-05-20** `modify` `POST /confirmSms` — response now includes `externalUserId` when present
- **2026-05-20** `modify` `POST /ky/enroll` — SMS verification is now opt-in via `sms: true` (no longer forced on every enrollment)
- **2026-05-18** `add` `GET /ky/enroll/status` — enrollment wizard progress endpoint
- **2026-05-18** `add` `POST /devTools/smsVerified` — manually set SMS verification data (dev only)
- **2026-05-18** `modify` `POST /validateSms` — added `phonePolicy` parameter
- **2026-05-18** `modify` `POST /confirmSms` — added `phonePolicy`, `persistTelephoneToKyb` params; documented response body
- **2026-05-18** `modify` `POST /iban/add` — clarified `externalUserId` usage and rpId scoping
- **2026-05-18** `modify` `GET /userData/{userId}` — documented readonly provider fields exposure

---

## Table of Contents

- [Authentication](#authentication)
- [User Identification Modes](#user-identification-modes)
- [1. KYC / KYB — Server to Server](#1-kyc--kyb--server-to-server)
  - [POST /ky](#post-ky)
  - [POST /ky/enroll](#post-kyenroll)
  - [POST /ky/enroll/idDocument](#post-kyenrollidDocument)
  - [GET /ky/enroll/status](#get-kyenrollstatus)
- [2. Session](#2-session)
  - [POST /session](#post-session)
  - [GET /session](#get-session)
  - [GET /session/short](#get-sessionshort)
- [3. Payment](#3-payment)
  - [POST /pay](#post-pay)
  - [POST /pay/confirm](#post-payconfirm)
  - [GET /pay](#get-pay)
  - [GET /pay/proceed](#get-payproceed)
  - [POST /pay/proceed](#post-payproceed)
  - [GET /pay/status](#get-paystatus)
  - [GET /pay/cancel](#get-paycancel)
- [4. User Data](#4-user-data)
  - [POST /userData](#post-userdata)
  - [GET /userData/{userId}](#get-userdatauserid)
  - [GET /userData/{userId}/{rpId}](#get-userdatauseridrpid)
  - [GET /userData/{userId}/data/{dataName}](#get-userdatauseriddatadataname)
  - [GET /userData/{userId}/{rpId}/data/{dataName}](#get-userdatauseridrpiddatadataname)
  - [GET /userData/external/{externalUserId}](#get-userdataexternalexternaluserid)
  - [GET /userData/external/{externalUserId}/data/{dataName}](#get-userdataexternalexternaluseriddatadataname)
- [5. Email Verification](#5-email-verification)
  - [POST /validateEmail](#post-validateemail)
  - [POST /confirmEmail](#post-confirmemail)
- [5b. SMS Verification](#5b-sms-verification)
  - [POST /validateSms](#post-validatesms)
  - [POST /confirmSms](#post-confirmsms)
- [6. Notifications](#6-notifications)
  - [POST /notify/{actionName}](#post-notifyactionname)
- [7. Recovery](#7-recovery)
  - [POST /registerRecovery](#post-registerrecovery)
  - [POST /getRecovery](#post-getrecovery)
- [8. Monerium](#8-monerium)
  - [POST /monerium/order](#post-moneriumorder)
  - [POST /iban/add](#post-ibanadd)
- [9. Chatbot — Session Endpoints](#9-chatbot--session-endpoints)
  - [POST /submit/partial](#post-submitpartial)
  - [GET /submit/basic](#get-submitbasic)
  - [GET /submit/advanced](#get-submitadvanced)
  - [POST /submit/log](#post-submitlog)
  - [POST /submit/companyLookup](#post-submitcompanylookup)
  - [GET /getCountries/{list}](#get-getcountrieslist)
- [10. AML (Anti-Money Laundering)](#10-aml-anti-money-laundering)
  - [POST /api/v1/check](#post-apiv1check)
  - [GET /api/v1/aml/checks](#get-apiv1amlchecks)
  - [GET /api/v1/aml/checks/stats](#get-apiv1amlchecksstats)
  - [GET /api/v1/aml/checks/{id}](#get-apiv1amlchecksid)
  - [POST /api/v1/aml/checks/{id}/review](#post-apiv1amlchecksidreview)
  - [GET /api/v1/aml/kyAlerts](#get-apiv1amlkyalerts)
  - [GET /api/v1/aml/rules](#get-apiv1amlrules)
  - [POST /api/v1/aml/rules](#post-apiv1amlrules)
  - [PUT /api/v1/aml/rules/{id}](#put-apiv1amlrulesid)
  - [DELETE /api/v1/aml/rules/{id}](#delete-apiv1amlrulesid)
- [11. Compliance](#11-compliance)
  - [GET /compliance/search](#get-compliancesearch)
  - [GET /compliance/search/document](#get-compliancesearchdocument)
  - [GET /compliance/opensanctions/search](#get-complianceopensanctionssearch)
  - [GET /compliance/opensanctions/pep](#get-complianceopensanctionspep)
  - [GET /compliance/opensanctions/screening](#get-complianceopensanctionsscreening)
  - [GET /compliance/opensanctions/wallet](#get-complianceopensanctionswallet)
  - [GET /compliance/opensanctions/identifier](#get-complianceopensanctionsidentifier)
  - [GET /compliance/opensanctions/{id}](#get-complianceopensanctionsid)
  - [GET /compliance/entity/{entity_id}](#get-complianceentityentity_id)
  - [GET /compliance/check-elu](#get-compliancecheck-elu)
  - [POST /compliance/screening/adverse-media](#post-compliancescreeningadverse-media)
  - [GET /compliance/report/{external_user_id}](#get-compliancereportexternal_user_id)
  - [GET /compliance/report/{external_user_id}/download](#get-compliancereportexternal_user_iddownload)
- [12. Webhooks](#12-webhooks)
- [13. Health](#13-health)
  - [GET /health](#get-health)
- [14. DevTools (Non-Production)](#14-devtools-non-production)
  - [GET /devTools/kyList](#get-devtoolskylist)
  - [GET /devTools/kyState/{userId}](#get-devtoolskystateuserid)
  - [GET /devTools/kyStateRpId/{rpId}/{userId}](#get-devtoolskystaterpidrpiduserid)
  - [POST /devTools/kyState](#post-devtoolskystate)
  - [POST /devTools/kyStateRpId](#post-devtoolskystaterpid)
  - [POST /devTools/smsVerified](#post-devtoolssmsverified)
- [15. Partner (Validator Portal)](#15-partner-validator-portal)
  - [POST /partner/preCheck](#post-partnerprecheck)

---

## Authentication

| Scheme | Header / Cookie | Description |
|--------|----------------|-------------|
| **API Key** | `x-api-key: <key>` | Server-to-server authentication |
| **Bearer Token** | `Authorization: Bearer <sessionId>` | Session-based authentication (chatbot / pay flows) |
| **AML Bearer** | `Authorization: Bearer <amlApiKey>` | AML-specific API key (separate from main API key) |
| **Validator Cookie** | Cookie `validator_sid` | Validator/Partner portal session |

---

## User Identification Modes

Most server-to-server endpoints support three user identification modes:

| Mode | Required Fields | Description |
|------|----------------|-------------|
| **Basic** | `userId` | Standard user identification |
| **RP context** | `userId` + `rpId` (+ optional `externalUserId`) | For ibexfi multi-tenant users |
| **External ID** | `externalUserId` | For ibexfi users identified by external ID |

---

## 1. KYC / KYB — Server to Server

### POST /ky

Create a new KY (Know Your Customer) session.

- **Auth:** `x-api-key`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User identifier |
| `rpId` | string | No | RP identifier (ibexfi) |
| `externalUserId` | string | No | External user ID (ibexfi) |
| `language` | string(2) | No | ISO language code (e.g. `"en"`) |
| `email` | string | No | Suggested email (format: email, max 254) |
| `trustedEmail` | boolean | No | If `true`, email is used as-is without verification (requires customer rights) |
| `requireSmsVerification` | boolean | No | If `true`, SMS verification of phone number will be required before KYC/KYB submission |
| `data` | object | No | Custom user data |

**Example Request:**

```json
{
  "userId": "ITUtPQlF",
  "language": "en",
  "email": "user@example.com",
  "trustedEmail": true
}
```

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `chatbotURL` | string | Base chatbot URL |
| `chatbotFullURL` | string | Full chatbot URL with session |
| `sessionId` | string | Session identifier (use as Bearer token) |
| `alreadySent` | boolean | `true` if KYC was already submitted (state >= 2) |

**Error Responses:** `400` Bad request

---

### POST /ky/enroll

Create (or resume) a KYB enrollment and return a chatbot session URL.
This endpoint never finalizes the KYB directly: final submission requires liveness and must be done through `POST /ky/enroll/idDocument`.

- **Auth:** `x-api-key`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User identifier |
| `email` | string (email) | Yes | Contact email (no verification, duplicates allowed) |
| `companyRegistrationNumber` | string | Yes | SIREN number (9 digits, pattern `^[0-9]{9}$`) |
| `rpId` | string | No | RP identifier (ibexfi) |
| `externalUserId` | string | No | External user ID (ibexfi) |
| `idDocument` | string (base64) | No | Representative's ID document front (recto) — JPEG/PNG/PDF. Alias for `idDocumentPage1` |
| `idDocumentPage1` | string (base64) | No | Alias for `idDocument` |
| `idDocumentPage2` | string (base64) | No | Representative's ID document back (verso) — required for ID cards |
| `sms` | boolean | No | If `true`, SMS OTP verification is required before ID document upload. Defaults to `false` |
| `submit` | boolean | No | **Not allowed on this endpoint**. If `true`, returns `400` (`submitRequiresSession`) |
| `returnUrl` | string (uri) | No | Redirect URL after document upload via web form |

**Behavior:**

1. If no existing KY record exists for the user, a KYB is created and linked.
2. If a KY record already exists in state `LVL1_IN_PROGRESS` (state `1`), the enrollment is treated as a resubmit and a new enroll session is issued.
3. ID document pages can be pre-uploaded (`idDocument`/`idDocumentPage1`/`idDocumentPage2`) and stored.
4. The endpoint always returns a session URL for chatbot completion (`enrollIdDocument=true`).
5. Final state change to submitted (`state 2`) happens only in `POST /ky/enroll/idDocument`.
6. **SMS verification is opt-in.** Pass `sms: true` in the request body to require SMS OTP verification before ID document upload. By default (`sms` omitted or `false`), no SMS verification is required. When enabled, the chatbot must complete `POST /validateSms` + `POST /confirmSms` before submission is allowed.

Representative and company enrichment is collected from INPI (with additional enrichment/fallback services when available) using the SIREN number.

**Example — Enrollment with RP context:**

```json
{
  "userId": "user123",
  "rpId": "demo.ibex.fi",
  "externalUserId": "ext_user_456",
  "email": "contact@entreprise.fr",
  "companyRegistrationNumber": "123456789",
  "idDocument": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Example — ID card pages pre-uploaded (still not submitted):**

```json
{
  "userId": "user123",
  "email": "contact@entreprise.fr",
  "companyRegistrationNumber": "123456789",
  "idDocument": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "idDocumentPage2": "data:image/jpeg;base64,/9j/4BBRSkZJRg..."
}
```

**Example — Deferred (no document uploaded yet):**

```json
{
  "userId": "user123",
  "email": "contact@entreprise.fr",
  "companyRegistrationNumber": "123456789",
  "returnUrl": "https://myapp.com/enrollment-complete"
}
```

**Example — Deferred with SMS OTP verification:**

```json
{
  "userId": "user123",
  "email": "contact@entreprise.fr",
  "companyRegistrationNumber": "123456789",
  "sms": true,
  "returnUrl": "https://myapp.com/enrollment-complete"
}
```

**Response `200` — Pending submit (documents uploaded, waiting final submit in chatbot):**

```json
{
  "userId": "user123",
  "status": "pending_submit",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "chatbotURL": "https://safe-testnet.ib.exchange/chatbot/",
  "chatbotFullURL": "https://safe-testnet.ib.exchange/chatbot/?session=...&enrollIdDocument=true"
}
```

**Response `200` — Pending ID document:**

```json
{
  "userId": "user123",
  "status": "pending_id_document",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "chatbotURL": "https://safe-testnet.ib.exchange/chatbot/",
  "chatbotFullURL": "https://safe-testnet.ib.exchange/chatbot/?session=...&enrollIdDocument=true&returnUrl=..."
}
```

**Additional non-production response field:**

- `warning` (string): duplicate SIREN warning (informational only in non-prod environments).

**Error Responses:** `400` Bad request

---

### POST /ky/enroll/idDocument

Submit ID document(s) for a pending KYB enrollment created via `POST /ky/enroll`.

- **Auth:** Bearer token (session)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `idDocument` | string (base64) | No | Front page — alias for `idDocumentPage1` |
| `idDocumentPage1` | string (base64) | No | Front page |
| `idDocumentPage2` | string (base64) | No | Back page (verso) |
| `submit` | boolean | No | Finalize enrollment. Implicit when both pages present |

Supports incremental submission: send pages one at a time. Previously uploaded pages are kept.

**Response `200` — Submitted:**

```json
{ "status": "submitted" }
```

**Response `200` — Documents saved (session stays open):**

```json
{ "status": "documents_saved" }
```

**Error Responses:** `400` Bad request · `401` Unauthorized

---

### GET /ky/enroll/status

Retrieve the current enrollment wizard progress (documents, SMS verification, suggested next phase).

- **Auth:** Bearer token (session, must be `session_type=enroll`)

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `requireSmsVerification` | boolean | Whether SMS verification is required for this session |
| `smsVerified` | boolean | Whether the phone number has been verified |
| `documents.idDocumentType` | string\|null | Selected document type (`"passport"` or `"idCard"`) |
| `documents.hasPage1` | boolean | Front page uploaded |
| `documents.hasPage2` | boolean | Back page uploaded |
| `documents.hasLiveness` | boolean | Liveness check completed |
| `documents.isComplete` | boolean | All required documents present |
| `documents.missingFields` | array | List of missing document fields |
| `suggestedPhase` | string | Suggested next step: `"sms"`, `"upload"`, `"liveness"`, or `"success"` |

**Error Responses:** `400` Invalid session type or data · `401` Unauthorized

---

## 2. Session

### POST /session

Create a new session.

- **Auth:** `x-api-key`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User identifier |
| `rpId` | string | No | RP identifier (ibexfi) |
| `data` | object | No | Custom user data |

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `chatbotURL` | string | Base chatbot URL |
| `chatbotFullURL` | string | Full chatbot URL with session |
| `sessionId` | string | Session identifier |

**Error Responses:** `400` Bad request

---

### GET /session

Retrieve full session information and associated customer data.

- **Auth:** Bearer token (session)

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `session.language` | string | Session language |
| `session.greetings` | object | Greetings per language (`{ "fr": "Bonjour", "en": "Hello" }`) |
| `session.theme` | string | Session theme |
| `session.supportName` | string | Support contact name |
| `session.countries.nationality` | array | Nationality country list |
| `session.countries.residency` | array | Residency country list |
| `session.countries.birth` | array | Birth country list |
| `session.activitySectors` | array | Activity sectors (`{ id, code, label_fr, label_en }`) |
| `session.fundsSources` | array | Funds sources (`{ id, code, label_fr, label_en }`) |
| `session.alreadySent` | boolean | `true` if KYC already submitted |
| `session.liveness` | boolean | `true` if liveness check done |
| `session.emailValidated` | boolean | `true` if email already validated |
| `session.kycType` | string | KYC provider type (`monerium` or `tractial`) |
| `session.kyType` | string | Entity type allowed (`individual`, `company`, or `both`) |

**Error Responses:** `401` Unauthorized · `500` Server error

---

### GET /session/short

Retrieve minimal session information.

- **Auth:** Bearer token (session)

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `session.language` | string | Session language |
| `session.alreadySent` | boolean | `true` if KYC already submitted |
| `session.liveness` | boolean | `true` if liveness check done |
| `session.emailValidated` | boolean | `true` if email validated |

**Error Responses:** `401` Unauthorized · `500` Server error

---

## 3. Payment

### POST /pay

Create a new payment session.

- **Auth:** `x-api-key`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Conditional | User identifier (Mode 1 or 2) |
| `rpId` | string | Conditional | RP identifier (Mode 2) |
| `externalUserId` | string | Conditional | External user ID (Mode 3) |
| `amount` | integer | Yes | Amount in cents (e.g. `1000` = 10.00 EUR). Minimum: 100 |
| `language` | string(2) | No | ISO language code |
| `userTransactionId` | string | No | Customer internal transaction ID |
| `forceProvider` | string | No | Force provider (`fenige` or `easytransac`) — test envs only |

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Payment session ID |
| `payURL` | string | Base payment URL |
| `payFullURL` | string | Full payment URL with session |

**Error Responses:** `400` Bad request

---

### POST /pay/confirm

Confirm a transaction after provider validation and blockchain submission.

- **Auth:** `x-api-key`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (uuid) | Yes | Transaction ID |
| `success` | boolean | Yes | Transaction success or failure |
| `date` | string (date-time) | Yes | Confirmation date (ISO 8601) |
| `transactionHash` | string | Yes | Blockchain transaction hash |
| `chainId` | string | Yes | Blockchain chain ID |

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Transaction ID |
| `status` | string | Updated status |
| `transactionHash` | string | Blockchain hash |

**Error Responses:** `400` Invalid parameters · `404` Transaction not found · `500` Server error

---

### GET /pay

Retrieve payment session information.

- **Auth:** Bearer token (session)

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `transactionId` | string | Transaction ID |
| `amount` | integer | Amount in cents |
| `status` | string | Status: `initiated`, `pending`, `success`, `failed`, `canceled` |
| `currency` | string | Currency code (e.g. `EUR`) |
| `language` | string | Language code |
| `userTransactionId` | string | Customer transaction ID |
| `missingUserInfo.email` | boolean | `true` if email is missing |
| `missingUserInfo.firstName` | boolean | `true` if first name is missing |
| `missingUserInfo.lastName` | boolean | `true` if last name is missing |

**Error Responses:** `401` Unauthorized · `500` Server error

---

### GET /pay/proceed

Process payment proceed request — redirects to payment provider (Easytransac/Fenige).

- **Auth:** Bearer token (session)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `safeReturnUrl` | string (uri) | Yes | Encoded return URL after payment |

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether proceed was successful |
| `data.display` | string | Display mode (`redirect` or `iframe`) |
| `data.paymentFormUrl` | string | URL to payment form |

**Error Responses:** `400` Bad request · `401` Unauthorized · `500` Server error

---

### POST /pay/proceed

Process payment directly with card data (Payment.net only).

- **Auth:** Bearer token (session)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cardData.number` | string | Yes | Card number (13-19 digits, spaces allowed) |
| `cardData.expDate` | string | Yes | Expiry date `MMYY` format |
| `cardData.cvv` | string | Yes | CVV code (3-4 digits) |
| `safeReturnUrl` | string (uri) | No | Return URL after payment |

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether request was successful |
| `data.status` | string | Transaction status (`pending` or `failed`) |
| `data.transactionId` | string | Transaction ID |
| `data.redirectUrl` | string | 3DS redirect URL (if required) |
| `data.require3DS` | boolean | Whether 3DS authentication is required |

**Error Responses:** `400` Invalid card data · `401` Unauthorized · `500` Server error

---

### GET /pay/status

Retrieve current payment status.

- **Auth:** Bearer token (session)

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `initiated`, `pending`, `success`, or `failed` |

**Error Responses:** `401` Unauthorized · `404` No transaction found · `500` Server error

---

### GET /pay/cancel

Cancel a payment transaction.

- **Auth:** Bearer token (session)

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether cancellation succeeded |
| `data.transactionId` | string | Transaction ID |
| `data.status` | string | Updated status |

**Error Responses:** `400` Bad request · `401` Unauthorized · `404` Transaction not found

---

## 4. User Data

### POST /userData

Create or update user data. Existing data is overwritten.

- **Auth:** `x-api-key`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Conditional | User identifier |
| `rpId` | string | No | RP identifier (ibexfi) |
| `externalUserId` | string | Conditional | External user ID (ibexfi) |
| `data` | object | Yes | Arbitrary user data object |

`data.private` is automatically moved to secure storage (`safe.private`). Large base64 strings (>3KB) are extracted and saved as files, replaced by references like `__file__:<filename>:<mimeType>:<size>`.

**Response `200`:** User data created or updated successfully.

---

### GET /userData/{userId}

Retrieve all data for a user.

- **Auth:** `x-api-key`

**Path Parameters:** `userId` (required)

**Query Parameters:** `includeFiles` — `"true"` (default) returns full base64 content, `"false"` returns only file references.

Readonly provider fields can be exposed in this response when present (for example `linking.kyStatusId` and `linking.iban.{iban,bic,provider,status}`), while `safe.*` remains hidden.

**Response `200`:** User data object. **`404`** User not found.

---

### GET /userData/{userId}/{rpId}

Retrieve all data for a user and rpId (ibexfi).

- **Auth:** `x-api-key`

**Path Parameters:** `userId`, `rpId` (both required)

**Query Parameters:** `includeFiles` (same as above)

**Response `200`:** User data object. **`404`** Not found.

---

### GET /userData/{userId}/data/{dataName}

Retrieve a specific data field for a user.

- **Auth:** `x-api-key`

**Path Parameters:** `userId`, `dataName` (both required)

**Query Parameters:** `includeFiles`

**Response `200`:** Specific data value. **`404`** Not found.

---

### GET /userData/{userId}/{rpId}/data/{dataName}

Retrieve specific data for a user and rpId.

- **Auth:** `x-api-key`

**Path Parameters:** `userId`, `rpId`, `dataName` (all required)

**Query Parameters:** `includeFiles`

**Response `200`:** Specific data value. **`404`** Not found.

---

### GET /userData/external/{externalUserId}

Retrieve all data for a user by externalUserId (ibexfi only).

- **Auth:** `x-api-key`

**Path Parameters:** `externalUserId` (required)

**Query Parameters:** `includeFiles`

**Response `200`:** User data. **`400`** Not allowed for non-ibexfi. **`404`** Not found.

---

### GET /userData/external/{externalUserId}/data/{dataName}

Retrieve specific data for a user by externalUserId (ibexfi only).

- **Auth:** `x-api-key`

**Path Parameters:** `externalUserId`, `dataName` (both required)

**Query Parameters:** `includeFiles`

**Response `200`:** Specific data value. **`400`** Not allowed for non-ibexfi. **`404`** Not found.

---

## 5. Email Verification

### POST /validateEmail

Send a verification code to an email address.

- **Auth:** `x-api-key` **or** Bearer token (session)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string (email) | Yes | Email to verify (max 254) |
| `userId` | string | No | User identifier (API key mode) |
| `rpId` | string | No | RP identifier (API key + ibexfi mode) |
| `externalUserId` | string | No | External user ID (API key + ibexfi mode) |

**Response:** Always `200` (for security reasons — no indication of email existence).

---

### POST /confirmEmail

Confirm email address with the received verification code.

- **Auth:** `x-api-key` **or** Bearer token (session)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string (email) | Yes | Email address |
| `code` | string | Yes | Verification code (pattern `^[a-zA-Z0-9_-]+$`) |
| `userId` | string | No | User identifier (API key mode) |
| `rpId` | string | No | RP identifier (ibexfi) |
| `externalUserId` | string | No | External user ID (ibexfi) |
| `userDataName` | string | No | userData key to store the email after confirmation |
| `optinNews` | boolean | No | Marketing consent for newsletters |
| `optinNotifications` | boolean | No | Marketing consent for notifications |

**Response:** `200` Success · `400` Bad request · `401` Unauthorized

---

## 5b. SMS Verification

### POST /validateSms

Send a 6-digit verification code by SMS to a phone number. Code expires after 1 hour. Max 5 attempts per hour.

- **Auth:** `x-api-key` **or** Bearer token (session)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `telephone` | string | Yes | Phone number (max 32, pattern `^(\+\|00)?[0-9]{8,}$`). Normalized to E.164. |
| `phonePolicy` | string | No | Validation policy: `"frMobile"` (French mobile only) or `"any"` (default). |
| `dryRun` | boolean | No | If `true` (non-production only), skip Brevo SMS sending and return the verification code in the response. The code is still inserted in DB so `POST /confirmSms` works normally. Ignored in production/preprod. |
| `userId` | string | No | User identifier (API key mode) |
| `rpId` | string | No | RP identifier (API key + ibexfi mode) |
| `externalUserId` | string | No | External user ID (API key + ibexfi mode) |

**Response:** Always `200` (for security reasons). When `dryRun: true` is used (non-production) or when real SMS sending is disabled for the customer (per-customer config), the response includes `{ code }` for testing.

---

### POST /confirmSms

Confirm phone number with the received SMS verification code. On success, stores `safe.smsVerifiedTelephone` (E.164 format) and `safe.smsVerifiedAt` (ISO timestamp) in userData.

- **Auth:** `x-api-key` **or** Bearer token (session)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `telephone` | string | Yes | Phone number (same as sent to /validateSms) |
| `code` | string | Yes | 6-digit verification code received by SMS |
| `phonePolicy` | string | No | Validation policy: `"frMobile"` or `"any"` (default). Must match the policy used in /validateSms. |
| `persistTelephoneToKyb` | boolean | No | If `true`, also persists the verified phone number into the KYB `telephone` field. |
| `userId` | string | No | User identifier (API key mode) |
| `rpId` | string | No | RP identifier (ibexfi) |
| `externalUserId` | string | No | External user ID (ibexfi) |

**Response `200`:**

```json
{ "smsVerified": true, "telephone": "+33612345678", "externalUserId": "ext_user_456" }
```

> `externalUserId` is present only if the KY has an associated externalUserId (ibexfi customers).

**Error Responses:** `400` Bad request (invalid/expired code, invalid phone) · `401` Unauthorized

**Activation:** SMS verification is activated per-session via the `requireSmsVerification: true` parameter in `POST /ky`. When active, `GET /submit/basic` will reject with `kycapi.sms.smsNotVerified` until the phone number is verified.

---

## 6. Notifications

### POST /notify/{actionName}

Send a notification to a user.

- **Auth:** `x-api-key`

**Path Parameters:** `actionName` (required) — the notification action to trigger.

**Available Actions:**

| Category | Action | Template Variables |
|----------|--------|--------------------|
| Trading | `buyToken` | `AMOUNT_IN`, `CURRENCY`, `TOKEN` |
| Trading | `tokenCredit` | `AMOUNT_IN`, `AMOUNT_OUT`, `CURRENCY`, `TOKEN` |
| Trading | `sellToken` | `AMOUNT_IN`, `TOKEN` |
| Trading | `tokenSold` | `AMOUNT_OUT`, `AMOUNT_IN`, `TOKEN`, `CURRENCY` |
| Funds | `fundWithdraw` | — |
| Funds | `fundInvest` | — |
| Transfers | `bankTransfer` | `AMOUNT`, `CURRENCY`, `DESTINATION`, `IBAN`, `DATE_FR`, `DATE_EN` |
| Transfers | `cryptoTransfer` | `AMOUNT`, `TOKEN`, `DESTINATION`, `ADDRESS_OUT`, `TX_LINK`, `DATE_FR`, `DATE_EN` |
| Wallet | `fiatCredit` | `AMOUNT`, `CURRENCY` |
| Wallet | `cryptoCredit` | `AMOUNT`, `TOKEN` |
| Account | `suspended` | — |
| Account | `reactivated` | — |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Conditional | User identifier |
| `rpId` | string | No | RP identifier (ibexfi) |
| `externalUserId` | string | Conditional | External user ID (ibexfi) |
| `language` | string(2) | No | ISO language code |
| `data` | object | No | Template variables for the notification |

**Response:** `200` Success · `400` Bad request · `404` User not found · `500` Server error

---

## 7. Recovery

### POST /registerRecovery

Register a recovery entry for a user's wallet.

- **Auth:** `x-api-key`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Conditional | User identifier |
| `rpId` | string | No | RP identifier (ibexfi) |
| `externalUserId` | string | Conditional | External user ID (ibexfi) |
| `address` | string | Yes | EVM wallet address |
| `data` | object | Yes | Recovery data to associate |

**Example:**

```json
{
  "userId": "ITUtPQlF",
  "address": "0xa9ca5C522DC5178C738420784929B36C30cba748",
  "data": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Response `200`:** Recovery registered successfully.

---

### POST /getRecovery

Retrieve recovery data for a user's wallet.

- **Auth:** `x-api-key`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Conditional | User identifier |
| `rpId` | string | No | RP identifier (ibexfi) |
| `externalUserId` | string | Conditional | External user ID (ibexfi) |
| `address` | string | Yes | EVM wallet address |

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | User identifier |
| `rpId` | string | RP identifier |
| `address` | string | EVM address |
| `data` | object | Recovery data |

---

## 8. Monerium

### POST /monerium/order

Create a new Monerium order (bank transfer via blockchain).

- **Auth:** `x-api-key`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Conditional | User identifier |
| `rpId` | string | No | RP identifier (ibexfi) |
| `externalUserId` | string | Conditional | External user ID |
| `amount` | string | Yes | Order amount (pattern `^[0-9]+(\.[0-9]{1,2})?$`) |
| `iban` | string | Yes | IBAN (2 letters + up to 32 alphanumeric, max 34) |
| `firstName` | string | Yes | Account holder first name |
| `lastName` | string | Yes | Account holder last name |
| `country` | string | Yes | Country code (2 uppercase letters) |
| `message` | string | Yes | Signed message for the order |
| `signature` | string | No | Message signature (required for EOA wallets, not for ibexfi) |
| `memo` | string | No | Reference appearing on bank transfer (5-140 chars) |

**Response:** `200` Order created · `400` Invalid data · `401` Unauthorized · `500` Server error

---

### POST /iban/add

Add a new IBAN for a user identified by `externalUserId` within a specific `rpId` perimeter.

- **Auth:** `x-api-key`
- **Scope:** `rpId` must be authorized for the calling API key.
- **Current provider support:** `tractial` only (multi-IBAN provider endpoint). `monerium` is intentionally not supported here.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rpId` | string | Yes | RP identifier |
| `externalUserId` | string | Yes | External user identifier |
| `provider` | string | Yes | IBAN provider (`tractial`) |
| `setDefault` | boolean | No (default `true`) | If true, sets `tractial.defaultIbanId` to the new IBAN |
| `label` | string | No | Free-text label for this IBAN (e.g. "Savings account", "Main"). Stored as `tractial.ibans.<ibanId>.label`, readable via `GET /userData` but not modifiable by the client. |

**Business rules:**
- The user must exist in the provided `rpId` perimeter.
- The KY record must be in an eligible state (default policy: state `5`, same intent as validated enrollment flow).
- `externalUserId` is used as the user identifier sent to BANKING when claiming an IBAN (`/api/v1/iban/pick`).
- On success, the IBAN is persisted into `ky_customer_data` under `tractial.ibans.<ibanId>.*` in the current `rpId` scope (same scope model as `profile.*` / `marketing.*`).

**Response `200` (example):**

```json
{
  "provider": "tractial",
  "rpId": "demo.ibex.fi",
  "externalUserId": "37MGgO53",
  "userId": "ITUtPQlF",
  "ibanId": "fr7630001007941234567890185",
  "defaultIbanId": "fr7630001007941234567890185",
  "iban": "FR7630001007941234567890185",
  "bic": "BDFEFRPP",
  "name": "DUPONT JEAN",
  "formatted": "FR76 3000 1007 9412 3456 7890 185",
  "accountNumber": "1234567890185",
  "label": "Main account"
}
```

**Error responses:**
- `400`: invalid payload / unsupported provider
- `403`: `rpId` not authorized for API key
- `404`: unknown `externalUserId` in perimeter
- `409`: KY state not eligible
- `502`: provider upstream error

---

### PATCH /iban/modify

Modify the `label` of an existing IBAN. Only the `label` field can be updated through this endpoint; all other IBAN fields remain unchanged.

- **Auth:** `x-api-key`
- **Scope:** `rpId` must be authorized for the calling API key.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rpId` | string | Yes | RP identifier |
| `externalUserId` | string | Yes | External user identifier |
| `ibanId` | string | Yes | Identifier of the IBAN to modify (lowercase normalized IBAN, e.g. `fr7630001007941234567890185`) |
| `label` | string | Yes | New label value. Pass an empty string to clear the label. |

**Response `200` (example):**

```json
{
  "rpId": "demo.ibex.fi",
  "externalUserId": "37MGgO53",
  "userId": "ITUtPQlF",
  "ibanId": "fr7630001007941234567890185",
  "label": "Savings account"
}
```

**Error responses:**
- `400`: missing or invalid fields (`externalUserId`, `rpId`, `ibanId`, `label`)
- `403`: `rpId` not authorized for API key
- `404`: unknown `externalUserId` in perimeter, or `ibanId` not found for this user

---

## 9. Chatbot — Session Endpoints

These endpoints require an active session (Bearer token).

### POST /submit/partial

Submit KY (KYC or KYB) data field by field or grouped. Can be called multiple times incrementally.

- **Auth:** Bearer token (session)

On the first call, set `entityType` to `"individual"` (KYC) or `"company"` (KYB).

**Request Body:** Any combination of fields from the `KyFields` schema:

<details>
<summary>KyFields — Full field list</summary>

| Field | Type | Description |
|-------|------|-------------|
| `entityType` | string | `individual` or `company` (required on first call) |
| `sex` | string | `M`, `F`, or `O` |
| `firstName` | string(64) | First name |
| `lastName` | string(64) | Last name |
| `name` | string(128) | Full name (alternative to firstName/lastName) |
| `streetAddress1` | string(64) | Address line 1 |
| `streetAddress2` | string(64) | Address line 2 |
| `zipCode` | string(12) | Postal code |
| `city` | string(64) | City |
| `country` | string(2) | Country of residency (ISO) |
| `placeId` | string(512) | Google Place ID |
| `birthDate` | date | Date of birth (must be 18-150 years) |
| `birthCity` | string(64) | Birth city |
| `birthCountry` | string(2) | Birth country (ISO) |
| `nationality` | string(2) | Nationality (ISO) |
| `pepo` | boolean | Politically exposed person |
| `idDocumentType` | string | `passport`, `idCard`, or `driversLicence` |
| `idDocumentNumber` | string(20) | ID document number |
| `idDocumentPage1` | string (base64) | ID document front |
| `idDocumentPage2` | string (base64) | ID document back |
| `idExpiryDate` | date | ID expiry date |
| `addressDocumentType` | string | `utility`, `bank`, or `tax` |
| `addressDocumentPage1` | string (base64) | Address proof document |
| `telephone` | string(32) | Phone number |
| `profession` | string(128) | Profession |
| `activitySectorCode` | string(64) | Activity sector code (from /session) |
| `activitySectorOther` | string(200) | Required if activitySectorCode = `OTHER` |
| `familySituation` | string(128) | Family situation |
| `housingSituation` | string(128) | Housing situation |
| `annualIncome` | integer | Annual income |
| `patrimony` | integer | Patrimony |
| `fundsSourceCode` | string(64) | Funds source code (from /session) |
| `fundsSourceOther` | string(500) | Required if fundsSourceCode = `OTHER` |
| `taxResidencyCountry` | string(2) | Tax residency country (ISO) |
| `estimatedAnnualTransactions` | integer/string | Estimated annual transactions in EUR |
| `usageReason` | string(1000) | Usage reason |
| `idDocument2` | string (base64) | Second identity proof |
| `fundsProofDocument` | string (base64) | Funds proof document (KYC only) |
| `uaotForm` | string (base64) | UAOT form |
| `serviceContract` | string (base64) | Service contract (KYC only) |
| `liveness.video` | string (base64) | Liveness video |
| `liveness.challenges` | array | Challenges (`TURN_LEFT`, `TURN_RIGHT`, `OPEN_MOUTH`) |
| `liveness.videoMetadata` | object | Video metadata |
| `companyName` | string(200) | Company name (KYB) |
| `companyRegistrationNumber` | string(50) | SIREN number (KYB) |
| `companyRegistrationDate` | date | Registration date (KYB) |
| `companyCountry` | string(2) | Registration country (KYB) |
| `companyType` | string(50) | Entity type: SA, SARL, SAS, etc. (KYB) |
| `address` | string(500) | Registered office address (KYB) |
| `naf` | string(10) | NAF code (KYB) |
| `activityDescription` | string(2000) | Activity description |
| `accountPurpose` | string(2000) | Account purpose |
| `transactionCountries` | string(500) | Transaction countries/regions |
| `companyFundsSource` | string(200) | Funds source (KYB only) |
| `companyFundsSourceOther` | string(500) | Required if `OTHER` (KYB only) |
| `kbis` | string (base64) | K-bis extract < 3 months |
| `beneficialOwnersDocument` | string (base64) | Ownership chart or RBE |
| `beneficialOwnersIdDocument` | string (base64) | Beneficial owners' ID copies |
| `representatives` | array | Legal representatives (see schema) |
| `effectiveBeneficiaries` | array | Beneficial owners >25% (see schema) |
| `taxResidencyForm` | string (base64) | Tax residency self-certification form |
| `companyServiceContract` | string (base64) | Service contract (KYB only) |
| `bankStatement` | string (base64) | Bank statement < 3 months |
| `addressProofDocument` | string (base64) | Address proof < 3 months |
| `articlesOfAssociation` | string (base64) | Company articles |
| `financialStatements` | string (base64) | Financial statements |
| `companyFundsProofDocument` | string (base64) | Initial funds proof (KYB only) |
| `idDocument` | string (base64) | ID document (KYB CGP type) |
| `orias` | string (base64) | ORIAS registration certificate (KYB CGP) |

</details>

**Response `200`:** `{ "userId": "..." }`

**Error Responses:** `400` Bad request

---

### GET /submit/basic

Validate and submit KYC data for basic KYC.

- **Auth:** Bearer token (session)

**Response `200`:** `{ "userId": "..." }`

**Error Responses:** `400` Unsuccessful submission · `404` userId not found

---

### GET /submit/advanced

Validate and submit KYC data for advanced KYC.

- **Auth:** Bearer token (session)

**Response `200`:** `{ "userId": "..." }`

**Response `400`:**

```json
{
  "message": "...",
  "fields": ["field1", "field2"]
}
```

**Error Responses:** `404` ID not found

---

### POST /submit/log

Log a customer action.

- **Auth:** Bearer token (session)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | object | Yes | Custom data to log |

**Response:** `200` Log created · `400` Bad request · `401` Unauthorized

---

### POST /submit/companyLookup

Lookup company information by SIREN via Pappers API.

- **Auth:** Bearer token (session)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `siren` | string | Yes | SIREN number (9 digits, pattern `^[0-9]{9}$`) |

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `found` | boolean | Whether the company was found |
| `siren` | string | Searched SIREN |
| `result` | object\|null | Full company data from Pappers |

**Error Responses:** `400` Invalid SIREN · `404` Company not found · `500` Server error

---

### GET /getCountries/{list}

Retrieve country lists.

- **Auth:** Bearer token (session)

**Path Parameters:**

| Parameter | Values | Description |
|-----------|--------|-------------|
| `list` | `nationality`, `residency`, `birth` | Type of country list |

**Response `200`:**

```json
{
  "list": "nationality",
  "countries": [
    { "code": "DE", "namefr": "Allemagne", "nameen": "Germany" }
  ]
}
```

**Error Responses:** `404` List not found

---

## 10. AML (Anti-Money Laundering)

### POST /api/v1/check

Run an AML screening check on a transaction.

- **Auth:** `Authorization: Bearer <amlApiKey>` (separate AML API key)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transactionId` | string | Yes | Unique transaction identifier |
| `type` | string | Yes | `SEPA_IN` or `SEPA_OUT` |
| `amount` | number | Yes | Transaction amount |
| `currency` | string | Yes | Currency code |
| `userId` | string | No | User identifier |
| `senderName` | string | No | Sender name |
| `senderIban` | string | No | Sender IBAN |
| `beneficiaryName` | string | No | Beneficiary name |
| `beneficiaryIban` | string | No | Beneficiary IBAN |
| `reference` | string | No | Transaction reference |
| `status` | string | No | Requested status override |
| `flagReason` | string | No | Reason for flagging |

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `approved`, `flagged`, or `rejected` |
| `flagReason` | string | Reason if flagged |
| `reason` | string | Detailed reason |
| `details` | object | Additional details |

**Error Responses:** `400` Missing required fields · `401` Invalid API key · `500` Server error

---

### GET /api/v1/aml/checks

List AML checks. **Auth:** Validator session (admin/superadmin).

### GET /api/v1/aml/checks/stats

Get AML check statistics. **Auth:** Validator session.

### GET /api/v1/aml/checks/{id}

Get a specific AML check by ID. **Auth:** Validator session.

### POST /api/v1/aml/checks/{id}/review

Review (approve/reject) an AML check. **Auth:** Validator session.

### GET /api/v1/aml/kyAlerts

List KY-related AML alerts. **Auth:** Validator session.

### GET /api/v1/aml/rules

List all AML screening rules. **Auth:** Validator session.

### POST /api/v1/aml/rules

Create a new AML screening rule. **Auth:** Validator session.

### PUT /api/v1/aml/rules/{id}

Update an AML screening rule. **Auth:** Validator session.

### DELETE /api/v1/aml/rules/{id}

Delete an AML screening rule. **Auth:** Validator session.

---

## 11. Compliance

All compliance endpoints require `x-api-key` and are restricted to the **ibexfi customer** only.

### GET /compliance/search

Search sanctioned entities by name (OFAC, Tresor, UK).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search term (min 2 chars) |
| `threshold` | integer | No | Similarity threshold 30-100% (default 60) |

**Response `200`:** `{ "count": number, "results": [...] }`

---

### GET /compliance/search/document

Search sanctioned entities by identity document number.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Document number (min 3 chars) |
| `threshold` | integer | No | Similarity threshold 30-100% (default 60) |

**Response `200`:** `{ "count": number, "results": [...] }`

---

### GET /compliance/opensanctions/search

Search OpenSanctions entities by name (sanctions, PEPs, debarments).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Name to search (min 2 chars) |
| `threshold` | integer | No | Similarity threshold 30-100% (default 60) |
| `schema` | string | No | `person` or `organization` |
| `birth_date` | string | No | Birth date prefix (YYYY, YYYY-MM, or YYYY-MM-DD) |

**Response `200`:** `{ "count": number, "results": [...] }`

---

### GET /compliance/opensanctions/pep

Search Politically Exposed Persons in OpenSanctions.

**Query Parameters:** Same as `/compliance/opensanctions/search`.

**Response `200`:** `{ "count": number, "results": [...] }`

---

### GET /compliance/opensanctions/screening

Screening search — sanctions, crimes, debarments (excludes PEP-only).

**Query Parameters:** Same as `/compliance/opensanctions/search`.

**Response `200`:** `{ "count": number, "results": [...] }`

---

### GET /compliance/opensanctions/wallet

Search by crypto wallet public key.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `public_key` | string | Yes | Wallet public key (min 10 chars) |

**Response `200`:** `{ "count": number, "results": [...] }`

---

### GET /compliance/opensanctions/identifier

Search by identity document number in OpenSanctions.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `number` | string | Yes | Document number (min 3 chars) |
| `threshold` | integer | No | Similarity threshold 30-100% (default 60) |
| `schema` | string | No | `person` or `organization` |

**Response `200`:** `{ "count": number, "results": [...] }`

---

### GET /compliance/opensanctions/{id}

Get detailed information for an OpenSanctions entity.

**Path Parameters:** `id` (e.g. `NK-xxx`, `Q-xxx`, `ofac-xxx`)

**Response `200`:** Entity details object. **`404`** Not found.

---

### GET /compliance/entity/{entity_id}

Get details of a sanctioned entity (OFAC/Tresor/UK) by ID.

**Path Parameters:** `entity_id` (integer)

**Response `200`:** Entity details. **`404`** Not found.

---

### GET /compliance/check-elu

Check if a person is an elected official in France (RNE database).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nom` | string | Yes | Last name (min 2 chars) |
| `prenom` | string | Yes | First name (min 2 chars) |
| `date_naissance` | string | No | Birth date (`YYYY-MM-DD` or `YYYY-MM`) |
| `threshold` | integer | No | Last name similarity threshold 0-100% (default 50). First name threshold = this + 20 |

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `is_elu` | boolean | Whether the person is an elected official |
| `total_mandats` | integer | Total number of mandates |
| `results` | array | Matching officials |

---

### POST /compliance/screening/adverse-media

Launch an AI-powered adverse media screening.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `external_user_id` | string | Yes | External user ID |
| `nom` / `name` | string | No | Full name |
| `date_naissance` / `birth_date` | string | No | Date of birth |
| `nationalite` / `nationality` | string | No | Nationality |
| `statut_pep` / `pep_status` | string | No | PEP status (`OUI`, `NON`, `EX-PEP`) |
| `email` | string (email) | No | Email to receive the PDF report |

**Response `201`:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"success"` |
| `session_id` | string | Screening session ID |
| `report` | string | Report identifier |
| `metadata` | object | Report metadata |

---

### GET /compliance/report/{external_user_id}

List all adverse media screening reports for a user.

**Response `200`:** `{ "total": number, "reports": [...] }` · **`404`** No screenings found.

---

### GET /compliance/report/{external_user_id}/download

Download the PDF adverse media screening report.

**Query Parameters:** `session_id` (optional — defaults to latest report)

**Response `200`:** PDF file · **`202`** PDF being generated · **`404`** Not found · **`422`** Screening failed.

---

## 12. Webhooks

Inbound webhook endpoints for payment providers. These are called by external services and are not meant for direct API consumption.

| Method | Path | Provider |
|--------|------|----------|
| POST | `/hooks/easytransac` | Easytransac |
| POST | `/hooks/fenige` | Fenige |
| POST | `/hooks/monerium-test` | Monerium (test) |
| POST | `/hooks/monerium-{suffix}` | Monerium (dynamic) |
| POST | `/hooks/yousign` | Yousign |
| POST | `/hooks/paymentnet` | Payment.net |

---

## 13. Health

### GET /health

Get API health status (no authentication required).

**Response `200`:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Overall health (`"ok"`) |
| `version` | string | API version |
| `timestamp` | string (date-time) | Current server timestamp |
| `database` | string | Database connectivity status |
| `databaseVersion` | string | Database schema version |
| `uptime` | number | Server uptime in seconds |

---

## 14. DevTools (Non-Production)

Available only on `development`, `staging`, `testnet`, and `prat1` environments.

### GET /devTools/kyList

Paginated list of KYB/KYC entries.

- **Auth:** `x-api-key`

The list is scoped to the customer identified by the API key.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |

**Response `200`:** Paginated KY customer list.

---

### GET /devTools/kyState/{userId}

Read the current state of a KYB/KYC.

- **Auth:** `x-api-key`

**Path Parameters:** `userId` — customer internal ID.

Use this endpoint only when `userId` is unique in your API key customer scope.
For ibexfi domain contexts (`rpId` flows), prefer `GET /devTools/kyStateRpId/{rpId}/{userId}`.

**Response `200`:** Current KY state. **`404`** Not found.

---

### GET /devTools/kyStateRpId/{rpId}/{userId}

Read the current KYB/KYC state for a specific ibexfi domain (`rpId`).

- **Auth:** `x-api-key`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `rpId` | string | ibexfi domain RP ID (example: `demobaas-prat1.ibex.fi`) |
| `userId` | string | Customer internal ID |

Recommended for PRAT1 and any multi-domain ibexfi integration to avoid customer-scope ambiguity.

**Response `200`:** Current KY state for this `rpId` and `userId`. **`404`** Not found.

---

### POST /devTools/kyState

Modify a KYB/KYC state and trigger associated actions.

- **Auth:** `x-api-key`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Customer internal ID |
| `newStateId` | integer | Yes | New state ID |
| `entityType` | string | Conditional | Required when `newStateId=5` and no entity type is already stored (`individual` or `company`) |
| `firstName` | string | Conditional | Required for `entityType=individual` when `newStateId=5` and `first_name` is missing |
| `lastName` | string | Conditional | Required for `entityType=individual` when `newStateId=5` and `last_name` is missing |
| `companyName` | string | Conditional | Required for `entityType=company` when `newStateId=5` and `company_name` is missing |

The state transition is applied in the customer scope resolved from the API key.
For ibexfi domain contexts (`rpId` flows), prefer `POST /devTools/kyStateRpId`.

When setting `newStateId=5` (ACCEPTED), DevTools now enforces identity prerequisites used by downstream IBAN flows (`/iban/add`):

- For `individual`: `first_name` + `last_name` must exist.
- For `company`: `company_name` must exist.
- If missing, send the corresponding fields in the request body (and `entityType` when not already defined).

If these prerequisites are not met, the endpoint returns `400` with `requiredFields`.

**State IDs:**

| ID | State |
|----|-------|
| 2 | SUBMITTED |
| 3 | INFO_REQUESTED |
| 4 | REJECTED |
| 5 | ACCEPTED |
| 22 | SIGNATURE_REQUESTED |
| 23 | SIGNATURE_RECEIVED |
| 55 | TEMPORARY_BLOCKED |

**Response `200`:** State changed. **`400`** Invalid request. **`404`** Not found.

---

### POST /devTools/kyStateRpId

Modify a KYB/KYC state for a specific ibexfi domain (`rpId`) and trigger associated actions.

- **Auth:** `x-api-key`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rpId` | string | Yes | ibexfi domain RP ID (example: `demobaas-prat1.ibex.fi`) |
| `userId` | string | Yes | Customer internal ID |
| `newStateId` | integer | Yes | New state ID |

Use this endpoint when your flow is domain-based (`rpId`) so the state change and follow-up actions are resolved against the correct customer context.

**State IDs:**

| ID | State |
|----|-------|
| 2 | SUBMITTED |
| 3 | INFO_REQUESTED |
| 4 | REJECTED |
| 5 | ACCEPTED |
| 22 | SIGNATURE_REQUESTED |
| 23 | SIGNATURE_RECEIVED |
| 55 | TEMPORARY_BLOCKED |

**Response `200`:** State changed. **`400`** Invalid request. **`404`** Not found.

---

### POST /devTools/smsVerified

Manually set SMS verification data (`safe.smsVerifiedTelephone` and/or `safe.smsVerifiedAt`) for a user without sending a real SMS. Useful for testing flows that require SMS verification.

- **Auth:** `x-api-key`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Customer internal ID |
| `smsVerifiedTelephone` | string | Conditional | Phone number (normalized to E.164). At least one of `smsVerifiedTelephone` or `smsVerifiedAt` is required |
| `smsVerifiedAt` | string | Conditional | ISO timestamp. Defaults to `now` when only `smsVerifiedTelephone` is provided |

**Response `200`:**

```json
{
  "success": true,
  "kyCustomerId": 42,
  "smsVerifiedTelephone": "+33612345678",
  "smsVerifiedAt": "2026-05-18T15:00:00.000Z"
}
```

**Error Responses:** `400` Invalid request (missing fields or invalid phone/date) · `404` KY customer not found

---

## 15. Partner (Validator Portal)

Endpoints under `/partner/*` are intended for authenticated validator/partner sessions.

### POST /partner/preCheck

Run a fast KYB pre-check on a SIREN without creating a KY file.

- **Auth:** Validator session cookie (`validator_sid`)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `siren` | string | Yes | SIREN number (9 digits, pattern `^\d{9}$`) |

The pre-check aggregates company data from INPI / Recherche Entreprises when available, runs sanctions/PEP screening on representatives and beneficial owners, computes the KYB risk score, and returns an eligibility verdict.

**Example Request:**

```json
{
  "siren": "123456789"
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "result": "OK"
  }
}
```

`result` is:
- `OK` when the computed score is below or equal to the auto-approve threshold.
- `KO` otherwise.

**Error Responses:** `400` Invalid SIREN / company not found / inactive company · `401` Not authenticated · `403` Forbidden
