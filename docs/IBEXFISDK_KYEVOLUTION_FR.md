# Suivi de l'état KYC d'un utilisateur (externalUserId)

Ce document décrit les mécanismes disponibles pour qu'un client (dApp, backend tenant) puisse vérifier ou recevoir en temps réel l'état KYC/KYB d'un utilisateur identifié par son `externalUserId`.

---

## Vue d'ensemble

| Mécanisme | Direction | Destinataire | Temps réel | Auth requise | Méthode SDK |
|-----------|-----------|--------------|------------|--------------|-------------|
| **Webhook** `user.ky.updated` | Push (l'API appelle le tenant) | Backend tenant (URL configurable) | Quasi temps réel | Configuration via `PATCH /v1.2/domain/kv` + `x-api-key` | *Pas encore dans le SDK* |
| **WebSocket** `user_ky_updated` | Push (l'API notifie le device) | Device de l'utilisateur connecté | Temps réel | JWT utilisateur | `IbexRealtimeClient.on('user_ky_updated', handler)` |
| **Polling REST** `/v1.2/domain/users/:externalUserId` | Pull (le tenant interroge l'API) | Backend tenant | Non | `x-api-key` | *Pas encore dans le SDK* |
| **Polling REST** `/v1.2/users/kyc/status` | Pull (l'utilisateur interroge l'API) | Utilisateur connecté | Non | JWT utilisateur | *Pas de méthode dédiée* — utiliser `getMe()` → `kycStatus` |
| **Profil agrégé** `GET /v1.2/users/me` | Pull | Utilisateur connecté | Non | JWT utilisateur | `getMe()` → `IbexNormalizedProfile.kycStatus` |
| **Admin DevTools** `/api/admin/devtools/ky/state/:externalUserId` | Pull | Backend (dev/test uniquement) | Non | `x-api-key` ou Basic | `devtools.kyGetState(externalUserId)` |

---

## 1. Niveaux KYC

L'API expose un niveau KYC simplifié sur trois valeurs :

| `kycLevel` | `status` | `verified` | Signification |
|------------|----------|------------|---------------|
| `"0"` | `not_started` | `false` | L'utilisateur n'a pas démarré de parcours KYC |
| `"1"` | `pending` | `false` | Parcours KYC en cours (soumis ou en attente d'info) |
| `"2"` | `verified` | `true` | KYC accepté, utilisateur vérifié |

Cycle de vie typique :

```
not_started → pending → verified
                     ↘ unknown (cas d'erreur / timeout)
```

---

## 2. Webhook (push vers le backend tenant)

### Principe

Lorsque le statut KYC d'un utilisateur change, l'API IBEX FI envoie un **POST HTTP** vers une URL configurée par le tenant. C'est le mécanisme recommandé pour les intégrations **backend-to-backend**.

> **Note SDK :** ce mécanisme n'est pas encore intégré dans le SDK `ibex`. La configuration et la réception du webhook se font directement via l'API REST IBEX FI.

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

## 3. WebSocket — événement `user_ky_updated`

### Principe

Le WebSocket permet de notifier **en temps réel le device de l'utilisateur** lorsque son KYC change. Utile pour mettre à jour l'interface utilisateur sans polling.

### Connexion et authentification

```javascript
const ws = new WebSocket('wss://<api-host>/ws?blockchainId=421614');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: accessToken,
    clientName: 'Mon App'
  }));
};
```

### Payload

```json
{
  "type": "user_ky_updated",
  "data": {
    "ky": "changed"
  },
  "timestamp": "2026-06-19T12:00:00.000Z"
}
```

### Caractéristiques

- Le payload est **volontairement minimal** : c'est un signal de rafraîchissement, pas un snapshot complet.
- Routé par Safe address : toute session WebSocket authentifiée pour cet utilisateur recevra l'événement.
- Si l'utilisateur possède plusieurs Safe addresses, un message peut être envoyé sur chaque canal connecté.

### Action recommandée côté client

> **Signal uniquement** — le payload ne contient pas le nouveau niveau. Le client doit refetcher le statut :

```javascript
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'user_ky_updated':
      // Rafraîchir le statut KYC
      const res = await fetch('/v1.2/users/kyc/status', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-IBEx-Auth': `Bearer ${accessToken}`,
          'X-Rp-Id': rpId,
          'X-RpId': rpId
        }
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
      "status": 200,
      "data": {
        "externalUserId": "ext-user-123",
        "kycLevel": "0",
        "status": "not_started",
        "verified": false
      }
    }
  }
}
```

Le client dispose donc du statut KYC dès la connexion, puis est notifié en temps réel de tout changement.

---

## 4. Polling REST — `GET /v1.2/domain/users/:externalUserId` (backend tenant)

Endpoint pour consulter le statut KYC côté serveur tenant, sans JWT utilisateur :

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

---

## 5. Polling REST — `GET /v1.2/users/kyc/status` (utilisateur connecté)

Endpoint dédié pour que l'utilisateur consulte son propre statut KYC :

```
GET /v1.2/users/kyc/status
Authorization: Bearer <access_token>
X-IBEx-Auth: Bearer <access_token>
X-Rp-Id: <rpId>
X-RpId: <rpId>
```

**Réponse (200) :**

```json
{
  "externalUserId": "081d27b9-...",
  "kycLevel": "0",
  "status": "not_started",
  "verified": false
}
```

| Champ | Type | Valeurs possibles | Description |
|-------|------|-------------------|-------------|
| `externalUserId` | string | UUID | Identifiant externe de l'utilisateur |
| `kycLevel` | string | `"0"`, `"1"`, `"2"` | Niveau KYC atteint |
| `status` | string | `"not_started"`, `"pending"`, `"verified"`, `"unknown"` | État courant du dossier |
| `verified` | boolean | `true` / `false` | KYC validé ou non |

Le statut est également disponible dans la réponse agrégée `GET /v1.2/users/me` (section `kycStatus`).

---

## 6. Admin / DevTools — consultation (dev/test uniquement)

Pour les environnements de développement/test, les endpoints DevTools permettent de lire et manipuler l'état KY :

| Endpoint | Méthode | Usage |
|----------|---------|-------|
| `/api/admin/devtools/ky/state/:externalUserId` | GET | Lire l'état KY détaillé |
| `/api/admin/devtools/ky/list?page=1&limit=20` | GET | Lister les dossiers KY du tenant |
| `/api/admin/devtools/ky/state` | POST | Forcer une transition d'état |

| `newStateId` | Signification |
|--------------|---------------|
| `2` | Soumis (submitted) |
| `3` | Informations complémentaires requises |
| `4` | Rejeté |
| `5` | Accepté |
| `22` | Signature demandée |
| `23` | Signature reçue |
| `55` | Blocage temporaire |

> Ces endpoints retournent `404` en production.

---

## 7. Flux complet (diagramme)

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

## 8. Recommandations d'intégration

### Pour un backend tenant (server-to-server)

1. **Configurer le webhook** `user.ky.updated` via `PATCH /v1.2/domain/kv` — c'est le moyen le plus rapide d'être notifié sans maintenir de connexion.
2. **À réception du webhook**, appeler `GET /v1.2/domain/users/:externalUserId` pour obtenir le niveau KYC à jour.
3. **Sécuriser** le endpoint webhook côté tenant (vérifier le header `X-Webhook-Key` ou tout autre secret configuré dans `headers`).
4. **Ne pas se fier uniquement au polling** — le webhook arrive quasi instantanément après le changement.

### Pour un frontend / app mobile (device utilisateur)

1. **Se connecter au WebSocket** après authentification JWT.
2. **Lire `kycStatus`** dans le message initial `user_data`.
3. **Écouter `user_ky_updated`** et refetcher `GET /v1.2/users/kyc/status` à réception.
4. **Prévoir un fallback HTTP** si le WebSocket est indisponible (polling périodique sur `/v1.2/users/kyc/status`, intervalle recommandé : 30–60 secondes pendant un onboarding KYC actif).

### Sécurité

- Les webhooks ne sont envoyés qu'aux URLs **HTTPS**.
- Le header personnalisé (`X-Webhook-Key` ou autre) permet au tenant de vérifier l'authenticité de l'appel.
- Le WebSocket requiert un JWT valide avec un `iss` correspondant au `rpId` du tenant.

---

## 9. Résumé des endpoints

| Endpoint | Méthode | Auth | Usage |
|----------|---------|------|-------|
| `/v1.2/domain/kv` | PATCH | `x-api-key` | Configurer le webhook du tenant |
| `/v1.2/domain/kv` | GET | `x-api-key` | Vérifier la configuration webhook |
| `/v1.2/domain/users/:externalUserId` | GET | `x-api-key` | Lire le statut KYC (backend tenant) |
| `/v1.2/users/kyc/status` | GET | JWT | Lire son propre statut KYC (utilisateur connecté) |
| `/v1.2/users/me` | GET | JWT | Profil agrégé incluant `kycStatus` |
| `/ws` | WebSocket | JWT (message `auth`) | Notifications temps réel (device) |
| `/api/admin/devtools/ky/state/:externalUserId` | GET | `x-api-key` ou Basic | Lecture détaillée (dev/test) |
| `/api/admin/devtools/ky/state` | POST | `x-api-key` ou Basic | Forcer transition (dev/test) |

---

## Notes importantes

- **Anti-flood** : l'API applique un garde anti-flood strict. Ne pas appeler le même endpoint deux fois de suite rapidement pour le même utilisateur (risque de `429`).
- **Webhook = signal** : le webhook ne contient pas le nouveau statut KYC. Il faut rappeler l'API (`GET /v1.2/domain/users/:externalUserId`) pour obtenir la valeur à jour.
- **Webhook = best-effort** : pas de retry automatique. Si votre serveur est injoignable, l'événement est perdu. Prévoir un polling périodique de secours.
- **Idempotence** : le client doit traiter `user_ky_updated` (WebSocket) de manière idempotente — l'événement peut être reçu plusieurs fois (notamment si l'utilisateur a plusieurs Safe connectés).
- **SDK** : le webhook n'est pas encore exposé dans le SDK `ibex`. La configuration se fait directement via l'API REST.

---

**Dernière mise à jour :** Juin 2026
