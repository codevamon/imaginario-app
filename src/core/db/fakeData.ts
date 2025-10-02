// Datos fake para modo web - Centralizados para consistencia
// Estos datos se usan cuando Capacitor.getPlatform() === 'web'

export const fakeBirds = [
  {
    id: 'bird-1',
    name: 'Lechuza común',
    scientific_name: 'Tyto alba',
    description: 'Ave rapaz nocturna de tamaño mediano, conocida por su característico canto y su capacidad de cazar en la oscuridad.',
    image_url: 'https://placehold.co/600x400?text=Lechuza+Común',
    rarity: 1,
    popularity: 85,
    updated_at: '2024-01-15T10:30:00Z',
    deleted_at: null,
    size: 'Mediano',
    weight: '300-500g',
    stage: 'Adulto'
  },
  {
    id: 'bird-2',
    name: 'Mirla patiamarilla',
    scientific_name: 'Turdus fuscater',
    description: 'Ave paseriforme de la familia Turdidae, reconocida por sus patas amarillas y su canto melodioso.',
    image_url: 'https://placehold.co/600x400?text=Mirla+Patiamarilla',
    rarity: 0,
    popularity: 92,
    updated_at: '2024-01-14T15:45:00Z',
    deleted_at: null,
    size: 'Mediano',
    weight: '80-120g',
    stage: 'Adulto'
  },
  {
    id: 'bird-3',
    name: 'Colibrí esmeralda',
    scientific_name: 'Chlorostilbon mellisugus',
    description: 'Pequeño colibrí de colores brillantes, conocido por su vuelo ágil y su capacidad de mantenerse suspendido en el aire.',
    image_url: 'https://placehold.co/600x400?text=Colibrí+Esmeralda',
    rarity: 2,
    popularity: 78,
    updated_at: '2024-01-13T09:20:00Z',
    deleted_at: null,
    size: 'Pequeño',
    weight: '3-5g',
    stage: 'Adulto'
  },
  {
    id: 'bird-4',
    name: 'Carpintero real',
    scientific_name: 'Campephilus pollens',
    description: 'Gran carpintero de bosques montanos, reconocido por su tamaño imponente y su tamborileo característico.',
    image_url: 'https://placehold.co/600x400?text=Carpintero+Real',
    rarity: 3,
    popularity: 65,
    updated_at: '2024-01-12T14:10:00Z',
    deleted_at: null,
    size: 'Grande',
    weight: '200-300g',
    stage: 'Adulto'
  },
  {
    id: 'bird-5',
    name: 'Tángara multicolor',
    scientific_name: 'Chlorochrysa nitidissima',
    description: 'Ave de colores vibrantes que habita en bosques húmedos, conocida por su plumaje iridiscente.',
    image_url: 'https://placehold.co/600x400?text=Tángara+Multicolor',
    rarity: 2,
    popularity: 88,
    updated_at: '2024-01-11T11:35:00Z',
    deleted_at: null,
    size: 'Pequeño',
    weight: '15-20g',
    stage: 'Adulto'
  },
  {
    id: 'bird-6',
    name: 'Águila arpía',
    scientific_name: 'Harpia harpyja',
    description: 'Una de las águilas más poderosas del mundo, símbolo de fuerza y majestuosidad en los bosques tropicales.',
    image_url: 'https://placehold.co/600x400?text=Águila+Arpía',
    rarity: 3,
    popularity: 95,
    updated_at: '2024-01-10T16:50:00Z',
    deleted_at: null,
    size: 'Muy grande',
    weight: '4-9kg',
    stage: 'Adulto'
  }
];

export const fakeTracks = [
  {
    id: 'track-1',
    bird_id: 'bird-1',
    title: 'Canto nocturno de la lechuza',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration_ms: 45000,
    updated_at: '2024-01-15T10:30:00Z',
    deleted_at: null
  },
  {
    id: 'track-2',
    bird_id: 'bird-1',
    title: 'Llamada de alerta',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration_ms: 12000,
    updated_at: '2024-01-15T10:30:00Z',
    deleted_at: null
  },
  {
    id: 'track-3',
    bird_id: 'bird-2',
    title: 'Melodía matutina',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration_ms: 30000,
    updated_at: '2024-01-14T15:45:00Z',
    deleted_at: null
  },
  {
    id: 'track-4',
    bird_id: 'bird-2',
    title: 'Canto territorial',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    duration_ms: 18000,
    updated_at: '2024-01-14T15:45:00Z',
    deleted_at: null
  },
  {
    id: 'track-5',
    bird_id: 'bird-3',
    title: 'Zumbido de alas',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    duration_ms: 8000,
    updated_at: '2024-01-13T09:20:00Z',
    deleted_at: null
  },
  {
    id: 'track-6',
    bird_id: 'bird-4',
    title: 'Tamborileo en madera',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    duration_ms: 25000,
    updated_at: '2024-01-12T14:10:00Z',
    deleted_at: null
  }
];

export const fakeInterviews = [
  {
    id: 'interview-1',
    bird_id: 'bird-1',
    title: 'Entrevista con experto en lechuzas',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    duration_ms: 180000,
    updated_at: '2024-01-15T10:30:00Z',
    deleted_at: null
  },
  {
    id: 'interview-2',
    bird_id: 'bird-2',
    title: 'Conversación sobre aves urbanas',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    duration_ms: 240000,
    updated_at: '2024-01-14T15:45:00Z',
    deleted_at: null
  },
  {
    id: 'interview-3',
    bird_id: 'bird-6',
    title: 'Documental sobre águilas arpía',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    duration_ms: 300000,
    updated_at: '2024-01-10T16:50:00Z',
    deleted_at: null
  }
];

export const fakeMusicians = [
  {
    id: 'musician-1',
    bird_id: 'bird-1',
    name: 'Dr. María González',
    bio: 'Ornitóloga especializada en aves rapaces nocturnas con más de 20 años de experiencia en investigación.',
    updated_at: '2024-01-15T10:30:00Z',
    deleted_at: null
  },
  {
    id: 'musician-2',
    bird_id: 'bird-2',
    name: 'Prof. Carlos Ruiz',
    bio: 'Experto en comportamiento de aves paseriformes y su relación con el ecosistema urbano.',
    updated_at: '2024-01-14T15:45:00Z',
    deleted_at: null
  },
  {
    id: 'musician-3',
    bird_id: 'bird-3',
    name: 'Ana Martínez',
    bio: 'Investigadora especializada en colibríes y su papel en la polinización de flores tropicales.',
    updated_at: '2024-01-13T09:20:00Z',
    deleted_at: null
  },
  {
    id: 'musician-4',
    bird_id: 'bird-6',
    name: 'Roberto Silva',
    bio: 'Conservacionista dedicado a la protección de águilas arpía y su hábitat en bosques tropicales.',
    updated_at: '2024-01-10T16:50:00Z',
    deleted_at: null
  }
];
