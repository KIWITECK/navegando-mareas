import { DijkstraStrategy } from './dijkstra.js';
import { AStarStrategy } from './astar.js';
import { BidirectionalStrategy } from './bidirectional.js';
export { DijkstraStrategy, AStarStrategy, BidirectionalStrategy };
export { CachedStrategy } from './cached.js';
export const strategies = { dijkstra: () => new DijkstraStrategy(), astar: () => new AStarStrategy(), bidirectional: () => new BidirectionalStrategy() };
