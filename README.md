# Game Platform — Monorepo

Stack : Turborepo · React + Vite · Node.js + Socket.io · PostgreSQL + Prisma · Redis

## Structure

```
game-platform/
├── apps/
│   ├── client/          # React + Vite (port 5173)
│   └── server/          # Node.js + Express + Socket.io (port 3001)
├── packages/
│   └── shared/          # Types TypeScript partagés
├── turbo.json
└── package.json
```

## Prérequis

- Node.js >= 20
- npm >= 10
- PostgreSQL
- Redis

## Installation

```bash
# Cloner le repo
git clone ...
cd game-platform

# Installer toutes les dépendances
npm install

# Configurer les variables d'environnement
cp apps/server/.env.example apps/server/.env
cp apps/client/.env.example apps/client/.env
# → éditer les fichiers .env

# Générer le client Prisma + migrer la BDD
cd apps/server
npx prisma migrate dev --name init
cd ../..
```

## Développement

```bash
# Lancer tout en parallèle (hot reload)
npm run dev

# Ou individuellement
cd apps/server && npm run dev
cd apps/client && npm run dev
```

## Commandes utiles

```bash
npm run build        # Build toutes les apps
npm run type-check   # Vérification TypeScript complète
npm run lint         # Lint toutes les apps

# Prisma
cd apps/server
npx prisma studio            # Interface visuelle BDD
npx prisma migrate dev       # Nouvelle migration
npx prisma generate          # Régénérer le client
```

## Namespaces Socket.io

| Namespace | Rôle |
|-----------|------|
| `/lobby`  | Présence globale, invitations entre amis |
| `/room`   | Gestion de room, chat, état de jeu |

## Mini-jeux

| ID | Statut |
|----|--------|
| `quiz` | À implémenter |
| `skribble` | À implémenter |
| `loup_garou` | À implémenter |
| `blind_test` | À implémenter |
| `undercover` | À implémenter |
