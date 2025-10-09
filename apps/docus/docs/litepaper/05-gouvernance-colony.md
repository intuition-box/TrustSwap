---
title: DAO Colony
sidebar_position: 5
---

Un DEX véritablement communautaire ne peut exister sans une gouvernance robuste, transparente et méritocratique. TrustSwap s’appuiera sur le protocole **Colony**, une solution éprouvée (ex. ShapeShift) pour structurer des organisations décentralisées tout en favorisant l’efficacité.

### Gouvernance par domaines et rôles

Colony permet de découper l’organisation en **domaines** (développement, marketing, trésorerie, partenariats, etc.), chacun pouvant être géré de manière semi-autonome. Les membres se voient attribuer des **rôles** en fonction de leurs contributions et de leur réputation, garantissant une gouvernance plus granulaire et proche des besoins.

### Réputation comme moteur de gouvernance

Contrairement aux systèmes où un token = une voix, Colony introduit la **réputation dynamique**. Elle se **gagne** via la contribution (développement, apport de liquidité, participation aux votes, modération, etc.), **ne s’achète pas**, et **décroît** en cas d’inactivité prolongée. Cela empêche la concentration du pouvoir chez quelques gros détenteurs et assure une gouvernance **méritocratique**.

### Lazy voting (consensus paresseux)

Au lieu de voter sur tout, **on ne vote que s’il y a objection crédible**.

* **Proposition** : un membre soumet une action (paiement, budget, listing, intégration).
* **Fenêtre d’objection** : pendant *T* heures/jours, tout membre disposant d’un **seuil minimal de réputation** dans le domaine peut **objecter**.
* **Sans objection → adoption** : l’action est **approuvée automatiquement** et exécutée.
* **Avec objection → vote** : l’action passe en **vote pondéré par la réputation** (dans le domaine concerné). Le résultat tranche, en cas de rejet, la proposition peut être révisée.
* **Garde-fous** : plus l’**enjeu** est important (montants/risques), plus la **fenêtre** et/ou le **seuil d’objection** sont élevés (micro-paiements auto-approuvés, gros engagements débattus).

**Bénéfices** : moins de “théâtre” de gouvernance, **décisions rapides** sur l’opérationnel, **véto crédible** quand c’est important, et droits alignés sur une **réputation vivante**.

### Trésorerie décentralisée

Les frais collectés par le DEX (swap fees, launchpad fees) alimentent la **DAO Treasury**. La communauté décide de leur usage (récompenses aux contributeurs, subventions, partenariats, rachat/burn du token natif, etc.).

### Prises de décision stratégiques

Les grandes orientations (nouveaux listings, intégrations de protocoles, partenariats) sont soumises à la DAO Colony. Le **poids des voix** dépend de la réputation, assurant que les décisions émanent des membres réellement investis.

### Complémentarité avec Intuition

La **réputation sociale/économique** (Intuition) complète la **réputation organisationnelle** (Colony). Les décisions peuvent s’appuyer sur les **données du graphe** (ex. lister un token validé par des utilisateurs réputés et des attestations vérifiables).
