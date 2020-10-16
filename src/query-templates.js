const queryTemplates = [
  {
    template: 'how fast can a $1 run',
    types: ['animal'],
  },
  {
    template: '$1 net worth',
    types: ['person'],
  },
  {
    template: 'who is $1',
    types: ['person'],
  },
  {
    template: 'weight of average $1',
    types: ['animal'],
  },
  {
    template: 'picture of $1',
    types: ['animal'],
  },
  {
    template: 'picture of $1',
    types: ['person'],
  },
  {
    template: '$1 $2',
    types: ['person', 'socialMedia'],
  },
  {
    template: '$1 calories',
    types: ['food'],
  },
  {
    template: 'recipe with $1',
    types: ['food'],
  },
];

const types = {
  animal: animals,
  person: people,
  food: food,
  socialMedia: socialMedias,
};
