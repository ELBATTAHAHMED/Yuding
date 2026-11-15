-- Repair only the exact corrupted seed strings; leave edited content intact.
UPDATE travel.featured_destinations
SET editorial_line = U&'L\00E0 o\00F9 la terre laisse passer l\2019oc\00E9an.'
WHERE city = 'Dakhla' AND editorial_line = 'L?? o?? la terre laisse passer l???oc??an.';

UPDATE travel.featured_destinations
SET editorial_detail = U&'Le vent, la lagune et des journ\00E9es qui s\2019\00E9tirent sans programme.'
WHERE city = 'Dakhla' AND editorial_detail = 'Le vent, la lagune et des journ??es qui s?????tirent sans programme.';

UPDATE travel.featured_destinations
SET editorial_line = U&'Perdez une rue. Trouvez une autre lumi\00E8re.'
WHERE city = 'Lisbon' AND editorial_line = 'Perdez une rue. Trouvez une autre lumi??re.';

UPDATE travel.featured_destinations
SET editorial_detail = U&'Lisbonne se d\00E9couvre \00E0 pied, colline apr\00E8s colline.'
WHERE city = 'Lisbon' AND editorial_detail = 'Lisbonne se d??couvre ?? pied, colline apr??s colline.';

UPDATE travel.featured_destinations
SET editorial_title = U&'Kyoto Tradition & D\00E9tours'
WHERE city = 'Kyoto' AND editorial_title = 'Kyoto Tradition & D??tours';

UPDATE travel.featured_destinations
SET editorial_line = U&'Le d\00E9tour devient le voyage.'
WHERE city = 'Kyoto' AND editorial_line = 'Le d??tour devient le voyage.';

UPDATE travel.featured_destinations
SET editorial_detail = U&'\00C0 Kyoto, ralentir est souvent la plus belle fa\00E7on d\2019avancer.'
WHERE city = 'Kyoto' AND editorial_detail = '?? Kyoto, ralentir est souvent la plus belle fa??on d???avancer.';
