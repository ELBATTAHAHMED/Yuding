# Conditions de Réservation et Modalités de Paiement Yuding

## Processus de réservation en 3 étapes
La réservation sur Yuding s'articule autour d'un cycle rigoureux garantissant l'intégrité des tarifs et de la disponibilité :
1. Recherche et sélection de l'offre : l'utilisateur choisit son vol, son hébergement, son activité ou son transfert.
2. Revalidation tarifaire côté serveur : avant tout paiement, le serveur Yuding interroge le fournisseur pour figer le devis (Server Pricing Quote) et garantir qu'aucun changement tarifaire inopiné n'intervienne.
3. Autorisation et règlement : le client procède au règlement via l'interface de paiement sécurisée.

## Distinction essentielle entre statut PAID et CONFIRMED
Chez Yuding, le cycle de vie d'un dossier comporte deux statuts distincts qui ne doivent jamais être confondus :
- Statut PAID (Payé) : Le paiement ou l'autorisation bancaire a été validé avec succès par la passerelle de paiement. Cependant, le dossier est encore en cours de synchronisation avec le système de réservation du fournisseur ou de la compagnie. La réservation n'est pas encore émise définitivement.
- Statut CONFIRMED (Confirmé) : Le fournisseur partenaire a validé l'attribution des places, des chambres ou des billets. Le voucher officiel et les références de transport sont émis et téléchargeables dans le dossier client.
Règle impérative : Le statut PAID signifie paiement validé, mais réservation en attente de confirmation fournisseur.

## Modalités de règlement et passerelles sécurisées
Toutes les transactions sur la plateforme s'appuient sur l'architecture Provider-Neutral de Yuding :
- Intégration PayPal Sandbox : permet de simuler des paiements par compte PayPal de test.
- Simulateur de cartes bancaires de démonstration : permet d'expérimenter le flux complet de validation sans engager de fonds monétaires réels.
- Aucune donnée bancaire brute (PAN complet ou cryptogramme CVV) n'est enregistrée dans nos bases de données.

## Devises et conversions monétaires
Les offres peuvent être libellées en Euros (EUR) ou en Dirhams marocains (MAD).
- Le montant de référence est toujours garanti par le serveur lors de la validation du devis.
- Les conversions de devises affichées s'appuient sur les taux de change officiels de la Banque Centrale Européenne ou les taux de référence bancaires.
