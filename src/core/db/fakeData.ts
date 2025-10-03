// Datos fake para modo web - Centralizados para consistencia
// Estos datos se usan cuando Capacitor.getPlatform() === 'web'

import type { Track } from './dao/tracks';
import type { Sing } from './dao/sings';
import { fakeUpdatedAt, fakeDeletedAt } from './fakeMeta';

export const fakeBirds = [
  {
    id: 'tyto-alba',
    name: 'Lechuza común',
    scientific_name: 'Tyto alba',
    description: 'Ave rapaz nocturna de tamaño mediano, conocida por su característico canto y su capacidad de cazar en la oscuridad.',
    image_url: 'https://placehold.co/600x400?text=Lechuza+Común',
    rarity: 1,
    popularity: 85,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    size: 'Mediano',
    weight: '300-500g',
    stage: 'Adulto'
  },
  {
    id: 'turdus-fuscater',
    name: 'Mirla patiamarilla',
    scientific_name: 'Turdus fuscater',
    description: 'Ave paseriforme de la familia Turdidae, reconocida por sus patas amarillas y su canto melodioso.',
    image_url: 'https://placehold.co/600x400?text=Mirla+Patiamarilla',
    rarity: 0,
    popularity: 92,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    size: 'Mediano',
    weight: '80-120g',
    stage: 'Adulto'
  },
  {
    id: 'colibri',
    name: 'Colibrí esmeralda',
    scientific_name: 'Chlorostilbon mellisugus',
    description: 'Pequeño colibrí de colores brillantes, conocido por su vuelo ágil y su capacidad de mantenerse suspendido en el aire.',
    image_url: 'https://placehold.co/600x400?text=Colibrí+Esmeralda',
    rarity: 2,
    popularity: 78,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    size: 'Pequeño',
    weight: '3-5g',
    stage: 'Adulto'
  },
  {
    id: 'campephilus-pollens',
    name: 'Carpintero real',
    scientific_name: 'Campephilus pollens',
    description: 'Gran carpintero de bosques montanos, reconocido por su tamaño imponente y su tamborileo característico.',
    image_url: 'https://placehold.co/600x400?text=Carpintero+Real',
    rarity: 3,
    popularity: 65,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    size: 'Grande',
    weight: '200-300g',
    stage: 'Adulto'
  },
  {
    id: 'chlorochrysa-nitidissima',
    name: 'Tángara multicolor',
    scientific_name: 'Chlorochrysa nitidissima',
    description: 'Ave de colores vibrantes que habita en bosques húmedos, conocida por su plumaje iridiscente.',
    image_url: 'https://placehold.co/600x400?text=Tángara+Multicolor',
    rarity: 2,
    popularity: 88,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    size: 'Pequeño',
    weight: '15-20g',
    stage: 'Adulto'
  },
  {
    id: 'harpia-harpyja',
    name: 'Águila arpía',
    scientific_name: 'Harpia harpyja',
    description: 'Una de las águilas más poderosas del mundo, símbolo de fuerza y majestuosidad en los bosques tropicales.',
    image_url: 'https://placehold.co/600x400?text=Águila+Arpía',
    rarity: 3,
    popularity: 95,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    size: 'Muy grande',
    weight: '4-9kg',
    stage: 'Adulto'
  }
];

export const fakeTracks: Track[] = [
  {
    id: 'track-1',
    bird_id: 'tyto-alba',
    title: 'Canto nocturno de la lechuza',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration_ms: 45000,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    community: 'Comunidad Kogui',
    instruments: 'Gaita',
    interpreters: 'Ambrosio Chimosquero, Eduardo Gil',
    author: 'Proyecto Msinduzhi'
  },
  {
    id: 'track-2',
    bird_id: 'tyto-alba',
    title: 'Llamada de alerta',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration_ms: 12000,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    community: 'Comunidad Kogui',
    instruments: 'Gaita',
    interpreters: 'Ambrosio Chimosquero',
    author: 'Proyecto Msinduzhi'
  },
  {
    id: 'track-3',
    bird_id: 'turdus-fuscater',
    title: 'Melodía matutina',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration_ms: 30000,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    community: 'Comunidad Kogui',
    instruments: 'Flauta',
    interpreters: 'Eduardo Gil',
    author: 'Proyecto Msinduzhi'
  },
  {
    id: 'track-4',
    bird_id: 'turdus-fuscater',
    title: 'Canto territorial',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    duration_ms: 18000,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    community: 'Comunidad Kogui',
    instruments: 'Tambor',
    interpreters: 'Ambrosio Chimosquero, Eduardo Gil',
    author: 'Proyecto Msinduzhi'
  },
  {
    id: 'track-5',
    bird_id: 'colibri',
    title: 'Zumbido de alas',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    duration_ms: 8000,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    community: 'Comunidad Kogui',
    instruments: 'Voz',
    interpreters: 'Ambrosio Chimosquero',
    author: 'Proyecto Msinduzhi'
  },
  {
    id: 'track-6',
    bird_id: 'campephilus-pollens',
    title: 'Tamborileo en madera',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    duration_ms: 25000,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    community: 'Comunidad Kogui',
    instruments: 'Marimba',
    interpreters: 'Eduardo Gil',
    author: 'Proyecto Msinduzhi'
  }
];

export const fakeInterviews = [
  {
    id: 'interview-1',
    bird_id: 'tyto-alba',
    title: 'Entrevista con experto en lechuzas',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    duration_ms: 180000,
    updated_at: '2024-01-15T10:30:00Z',
    deleted_at: null
  },
  {
    id: 'interview-2',
    bird_id: 'turdus-fuscater',
    title: 'Conversación sobre aves urbanas',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    duration_ms: 240000,
    updated_at: '2024-01-14T15:45:00Z',
    deleted_at: null
  },
  {
    id: 'interview-3',
    bird_id: 'harpia-harpyja',
    title: 'Documental sobre águilas arpía',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    duration_ms: 300000,
    updated_at: '2024-01-10T16:50:00Z',
    deleted_at: null
  }
];

export const fakeSings: Sing[] = [
  {
    id: 'colibri-sing-1',
    bird_id: 'colibri',
    title: 'Canto matutino',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    duration_ms: 12000,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    community: 'Comunidad Kogui',
    instruments: 'Voz',
    interpreters: 'Ambrosio Chimosquero',
    author: 'Trochilidae'
  },
  {
    id: 'colibri-sing-2',
    bird_id: 'colibri',
    title: 'Canto al atardecer',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
    duration_ms: 15000,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    community: 'Comunidad Kogui',
    instruments: 'Voz',
    interpreters: 'Eduardo Gil',
    author: 'Trochilidae'
  },
  {
    id: 'colibri-sing-3',
    bird_id: 'colibri',
    title: 'Canto de cortejo',
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
    duration_ms: 18000,
    updated_at: fakeUpdatedAt(),
    deleted_at: fakeDeletedAt(),
    community: 'Comunidad Kogui',
    instruments: 'Voz',
    interpreters: 'Ambrosio Chimosquero, Eduardo Gil',
    author: 'Trochilidae'
  }
];

export const fakeMusicians = [
  {
    id: 'musician-1',
    bird_id: 'tyto-alba',
    name: 'Dr. María González',
    bio: 'Ornitóloga especializada en aves rapaces nocturnas con más de 20 años de experiencia en investigación.',
    updated_at: '2024-01-15T10:30:00Z',
    deleted_at: null
  },
  {
    id: 'musician-2',
    bird_id: 'turdus-fuscater',
    name: 'Prof. Carlos Ruiz',
    bio: 'Experto en comportamiento de aves paseriformes y su relación con el ecosistema urbano.',
    updated_at: '2024-01-14T15:45:00Z',
    deleted_at: null
  },
  {
    id: 'musician-3',
    bird_id: 'colibri',
    name: 'Ana Martínez',
    bio: 'Investigadora especializada en colibríes y su papel en la polinización de flores tropicales.',
    updated_at: '2024-01-13T09:20:00Z',
    deleted_at: null
  },
  {
    id: 'musician-4',
    bird_id: 'harpia-harpyja',
    name: 'Roberto Silva',
    bio: 'Conservacionista dedicado a la protección de águilas arpía y su hábitat en bosques tropicales.',
    updated_at: '2024-01-10T16:50:00Z',
    deleted_at: null
  }
];
