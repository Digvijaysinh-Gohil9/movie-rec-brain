import Dexie, { type Table } from 'dexie'
import type { Rating, TasteProfile, SeenEntry, WatchlistEntry } from './types'

class MovieRecommenderDB extends Dexie {
  ratings!: Table<Rating, string>
  tasteProfile!: Table<TasteProfile, number>
  seen!: Table<SeenEntry, string>
  watchlist!: Table<WatchlistEntry, string>

  constructor() {
    super('MovieRecommenderDB')

    this.version(1).stores({
      ratings: 'id, mediaType, score, ratedAt',
      tasteProfile: 'id',
      seen: 'id',
    })

    // Version 2 adds watchlist
    this.version(2).stores({
      ratings: 'id, mediaType, score, ratedAt',
      tasteProfile: 'id',
      seen: 'id',
      watchlist: 'id, addedAt',
    })
  }
}

export const db = new MovieRecommenderDB()
