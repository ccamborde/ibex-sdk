# IBEX FI API – Suivi de l'évolution KYC d'un utilisateur (tenant)

## Vue d'ensemble

Ce document décrit les mécanismes à disposition d'un **tenant** (identifié par son `rpId`) pour suivre et vérifier l'état KYC de ses utilisateurs (`externalUserId`).

Trois approches complémentaires sont disponibles :

| Mécanisme | Direction | Destinataire | Temps réel | Auth requise |
|-----------|-----------|--------------|------------|--------------|
| **Polling REST** | Pull (le tenant interroge l'API) | Backend tenant | Non | `x-api-key` |
| **Webhook** | Push (l'API appelle le tenant) | Backend tenant (URL configurable) | Quasi temps réel | Configuration via `/v1.2/domain/kv` |
| **WebSocket** | Push (l'API notifie le device) | Device de l'utilisateur connecté | Temps réel | JWT utilisateur |

---

## 1. Niveaux KYC

L'API expose un niveau KYC simplifié sur trois valeurs :

| `kycLevel` | `status` | `verified` | Signification |
|------------|----------|------------|---------------|
| `"0"` | `not_started` | `false` | L'utilisateur n'a pas démarré de parcours KYC |
| `"1"` | `pending` | `false` | Parcours KYC en cours (soumis ou en attente d'info) |
| `"2"` | `verified` | `true` | KYC accepté, utilisateur vérifié |

---

## 2. Polling REST (côté backend tenant)

### Consulter le statut KYC d'un utilisateur par `externalUserId`

```http
GET /v1.2/domain/users/{externalUserId}
Host: app.ibex.fi
x-api-key: <votre_cle_api_tenant>
```

**Réponse (200) :**

```json
{
  "id": "ext-user-123",
  "ky": "2",
  "signers": [
    {
      "id": "signer-uuid",
      "safes": [
        {
          "address": "0x...",
          "threshold": 1,
          "iban": { "chainId": 100, "iban": "FR76...", "bic": "BNPAFRPP" }
        }
      ]
    }
  ]
}
```

Le champ `ky` contient le niveau KYC (`"0"`, `"1"`, `"2"`).

### Endpoint dédié KYC (côté utilisateur)

Si l'utilisateur est connecté (JWT), il peut consulter son propre statut :

```http
GET /v1.2/users/kyc/status
Authorization: Bearer <jwt_access_token>
```

**Réponse (200) :**

```json
{
  "externalUserId": "ext-user-123",
  "kycLevel": "0",
  "status": "not_started",
  "verified": false
}
```

---

## 3. Webhook (push vers le backend tenant)

### Principe

Lorsque le statut KYC d'un utilisateur change, l'API IBEX FI envoie un **POST HTTP** vers une URL configurée par le tenant. C'est le mécanisme recommandé pour les intégrations backend-to-backend.

### Configuration

Le tenant configure son webhook via l'endpoint **`/v1.2/domain/kv`** avec sa clé API :

```http
PATCH /v1.2/domain/kv
Host: app.ibex.fi
x-api-key: <votre_cle_api_tenant>
Content-Type: application/json

{
  "patch": {
    "webhooks": {
      "userEvents": {
        "enabled": true,
        "url": "https://votre-backend.example/webhooks/ibex",
        "events": ["user.ky.updated"],
        "headers": {
          "X-Webhook-Key": "votre-secret-partage"
        },
        "timeoutMs": 3000
      }
    }
  }
}
```

### Paramètres de configuration

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `enabled` | boolean | Non (défaut `true`) | Active/désactive les webhooks sortants |
| `url` | string | **Oui** (si enabled) | URL HTTPS appelée par l'API IBEX FI |
| `events` | string[] | Non | Liste blanche d'événements ; si absent, tous les événements éligibles sont envoyés |
| `headers` | object | Non | Headers HTTP statiques ajoutés à chaque appel (ex. secret partagé) |
| `timeoutMs` | number | Non (défaut 3000) | Timeout de la requête en ms (borné entre 500 et 10000) |

### Événements disponibles

| Événement | Déclencheur |
|-----------|-------------|
| `user.ky.updated` | Changement de statut KYC d'un utilisateur |
| `user.iban.updated` | Changement d'IBAN d'un utilisateur |

### Payload reçu par le tenant

Lorsqu'un événement `user.ky.updated` est déclenché, votre URL reçoit un **POST** avec le body suivant :

```json
{
  "event": "user.ky.updated",
  "occurredAt": "2026-06-19T12:00:00.000Z",
  "tenant": {
    "rpId": "votre-tenant.ibex.fi"
  },
  "user": {
    "userId": "uuid-interne",
    "externalUserId": "ext-user-123"
  },
  "data": {
    "userId": "uuid-interne",
    "externalUserId": "ext-user-123",
    "signal": "changed"
  }
}
```

> **Important :** le webhook est un **signal de changement** — il ne contient pas le nouveau niveau KYC. Votre backend doit rappeler l'API pour obtenir le statut à jour :
>
> ```http
> GET /v1.2/domain/users/ext-user-123
> x-api-key: <votre_cle_api_tenant>
> ```

### Comportement

- L'appel est **best-effort** (pas de retry automatique en cas d'échec).
- Si l'URL ne répond pas dans le délai `timeoutMs`, l'appel est abandonné.
- Un utilisateur partagé entre plusieurs tenants déclenche un webhook vers **chaque** tenant configuré.
- Les appels webhook sont tracés dans les logs internes.

### Vérifier la configuration actuelle

```http
GET /v1.2/domain/kv
x-api-key: <votre_cle_api_tenant>
```

Réponse :

```json
{
  "data": {
    "webhooks": {
      "userEvents": {
        "enabled": true,
        "url": "https://votre-backend.example/webhooks/ibex",
        "events": ["user.ky.updated"],
        "headers": { "X-Webhook-Key": "***" },
        "timeoutMs": 3000
      }
    }
  }
}
```

---

## 4. WebSocket (push vers le device utilisateur)

### Principe

Le WebSocket permet de notifier **en temps réel le device de l'utilisateur** lorsque son KYC change. Cela est utile pour mettre à jour l'interface utilisateur sans polling.

### Connexion et authentification

```javascript
const ws = new WebSocket('wss://app.ibex.fi/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: '<jwt_access_token>',
    clientName: 'Mon App'
  }));
};
```

### Événement `user_ky_updated`

Lorsque le statut KYC change, le serveur envoie au client connecté :

```json
{
  "type": "user_ky_updated",
  "data": {
    "ky": "changed"
  },
  "timestamp": "2026-06-19T12:00:00.000Z"
}
```

> **Signal uniquement** — le payload ne contient pas le nouveau niveau. Le client doit refetcher le statut :

```javascript
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'user_ky_updated':
      // Rafraîchir le statut KYC
      const res = await fetch('/v1.2/users/kyc/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const kycStatus = await res.json();
      // kycStatus = { externalUserId, kycLevel, status, verified }
      break;
  }
};
```

### Données initiales après authentification

Après l'envoi du message `auth`, le serveur pousse automatiquement un message `user_data` qui contient (entre autres) la section `kycStatus` :

```json
{
  "type": "user_data",
  "data": {
    "kycStatus": {
      "externalUserId": "ext-user-123",
      "kycLevel": "0",
      "status": "not_started",
      "verified": false
    }
  }
}
```

Le client dispose donc du statut KYC dès la connexion, puis est notifié en temps réel de tout changement.

---

## 5. Flux complet (diagramme)

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Utilisateur │     │   IBEX FI API    │     │ Backend      │
│ (device)    │     │                  │     │ Tenant       │
└──────┬──────┘     └────────┬─────────┘     └──────┬───────┘
       │                     │                       │
       │  Complète le KYC    │                       │
       │  (chatbot/iframe)   │                       │
       │─────────────────────>                       │
       │                     │                       │
       │                     │  ← KYC mis à jour     │
       │                     │    (service interne)  │
       │                     │                       │
       │  WS: user_ky_updated                        │
       │<────────────────────│                       │
       │                     │                       │
       │                     │  POST webhook         │
       │                     │  user.ky.updated      │
       │                     │──────────────────────>│
       │                     │                       │
       │  GET /v1.2/users/kyc/status                 │
       │─────────────────────>                       │
       │  { kycLevel: "2", verified: true }          │
       │<────────────────────│                       │
       │                     │                       │
       │                     │  GET /v1.2/domain/    │
       │                     │  users/ext-user-123   │
       │                     │<──────────────────────│
       │                     │  { ky: "2", ... }     │
       │                     │──────────────────────>│
       │                     │                       │
```

---

## 6. Recommandations d'intégration

### Pour un backend tenant (server-to-server)

1. **Configurer le webhook** `user.ky.updated` via `PATCH /v1.2/domain/kv`.
2. **À réception** du webhook, appeler `GET /v1.2/domain/users/:externalUserId` pour obtenir le niveau KYC à jour.
3. **Sécuriser** le endpoint webhook côté tenant (vérifier le header `X-Webhook-Key` ou tout autre secret configuré).
4. **Ne pas se fier uniquement au polling** — le webhook est le moyen le plus rapide d'être notifié.

### Pour un frontend / app mobile (device utilisateur)

1. **Se connecter au WebSocket** après authentification JWT.
2. **Lire `kycStatus`** dans le message initial `user_data`.
3. **Écouter `user_ky_updated`** et refetcher `GET /v1.2/users/kyc/status` à réception.
4. **Prévoir un fallback HTTP** si le WebSocket est indisponible (polling périodique sur `/v1.2/users/kyc/status`).

### Sécurité

- Les webhooks ne sont envoyés qu'aux URLs **HTTPS**.
- Le header personnalisé (`X-Webhook-Key` ou autre) permet au tenant de vérifier l'authenticité de l'appel.
- Le WebSocket requiert un JWT valide avec un `iss` correspondant au `rpId` du tenant.

---

## 7. Résumé des endpoints

| Endpoint | Méthode | Auth | Usage |
|----------|---------|------|-------|
| `/v1.2/domain/users/:externalUserId` | GET | `x-api-key` | Lire le statut KYC d'un utilisateur (backend tenant) |
| `/v1.2/users/kyc/status` | GET | JWT | Lire son propre statut KYC (utilisateur connecté) |
| `/v1.2/domain/kv` | PATCH | `x-api-key` | Configurer le webhook du tenant |
| `/v1.2/domain/kv` | GET | `x-api-key` | Vérifier la configuration webhook |
| `/ws` | WebSocket | JWT (message `auth`) | Recevoir les notifications temps réel |

---

**Dernière mise à jour :** Juin 2026
