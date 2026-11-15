# Deliverability — e-mails transactionnels Yuding

Les e-mails de vérification sont transactionnels. Le template seul ne peut pas empêcher leur classement en spam : le domaine de l'expéditeur doit être authentifié et le lien doit pointer vers une URL publique.

## Configuration de production requise

Configurez ces variables sur le service `notification-service` avec un fournisseur SMTP transactionnel ou le SMTP d'un domaine déjà vérifié :

```text
SMTP_HOST=smtp.votre-fournisseur.tld
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_AUTH=true
SMTP_STARTTLS=true
SMTP_FROM_ADDRESS=no-reply@notifications.votre-domaine.tld
SMTP_FROM_NAME=Yuding
YUDING_FRONTEND_BASE_URL=https://app.votre-domaine.tld
```

Ne mettez jamais `localhost`, `yuding.local`, ni une adresse Gmail personnelle dans cette configuration de production.

## DNS du domaine d'envoi

Dans le fournisseur choisi, activez et vérifiez :

1. SPF ;
2. DKIM ;
3. DMARC (`p=none` pendant l'observation, puis `quarantine` ou `reject`).

Le domaine dans `SMTP_FROM_ADDRESS` doit être le même domaine ou un sous-domaine aligné avec la signature DKIM. Le service génère maintenant un `Message-ID` aligné sur ce domaine au lieu de `yuding.local`.

## Vérification locale

Pour le développement, Mailpit conserve les e-mails à `http://localhost:8025`. Il ne remet pas de messages sur Internet ; il est donc normal qu'un compte Gmail ne reçoive rien depuis cette configuration locale.
