// Older seed rows were stored with literal question marks. Only repair exact
// known seed strings in the display; editorial changes are left untouched.
const seedText: Record<string, string> = {
  'L?? o?? la terre laisse passer l???oc??an.': 'Là où la terre laisse passer l’océan.',
  'Le vent, la lagune et des journ??es qui s?????tirent sans programme.': 'Le vent, la lagune et des journées qui s’étirent sans programme.',
  'Perdez une rue. Trouvez une autre lumi??re.': 'Perdez une rue. Trouvez une autre lumière.',
  'Lisbonne se d??couvre ?? pied, colline apr??s colline.': 'Lisbonne se découvre à pied, colline après colline.',
  'Kyoto Tradition & D??tours': 'Kyoto Tradition & Détours',
  'Le d??tour devient le voyage.': 'Le détour devient le voyage.',
  '?? Kyoto, ralentir est souvent la plus belle fa??on d???avancer.': 'À Kyoto, ralentir est souvent la plus belle façon d’avancer.',
};

export function displayFeaturedText(value?: string | null): string {
  return value ? seedText[value] ?? value : '';
}
