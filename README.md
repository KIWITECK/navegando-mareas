# Navegando mareas: estrategias de navegación en la arquitectura de software

Prototipo de la Actividad 6 (Unidad 3) del curso *Arquitectura de Software* — Tecnológica del Oriente.
Autor: David Ricardo Amaya Rojas.

Sistema de **navegación de rutas con tráfico dinámico** para repartos con varias paradas. Sin dependencias externas (Node.js ≥ 20).

```
Solicitud ─▶ NavigationService (Fachada) ─▶ Orden de paradas (Strategy: vecino más cercano / 2-opt)
                    │                    └▶ Camino mínimo (Strategy: Dijkstra / A* / bidireccional + caché Proxy)
                    ▼
              Viaje = Route (Composite de tramos) ─▶ InstructionIterator (Iterator)
                    ▲
TrafficFeed (Subject) ─▶ NavigationSession y caché (Observer) ─▶ RerouteCommand (Command, con deshacer/rehacer)
```

## Patrones de diseño
| Patrón | Dónde |
|---|---|
| Strategy | `src/strategies/*` (camino mínimo) y `src/stops.js` (orden de paradas) |
| Composite | `src/route.js` — `Leg` (hoja) y `Route` (compuesto) |
| Iterator | `src/route.js` — `InstructionIterator` |
| Observer | `src/observer.js` — `TrafficFeed`; observadores: `NavigationSession` y `CachedStrategy` |
| Command | `src/commands.js` — `PlanTripCommand`, `AddStopCommand`, `RerouteCommand`, `CommandHistory` |
| Proxy | `src/strategies/cached.js` — caché con invalidación por tráfico |
| Facade | `src/service.js` — `NavigationService` |

## Uso
```bash
npm run demo     # sesión de ejemplo con atasco y deshacer
npm test         # 16 pruebas
npm run bench    # E1–E4 (~35 s); escribe docs/resultados.json
npm run viz      # mapas de nodos explorados en docs/exploracion-*.svg
```

## Resultados (ciudad sintética; mediana de consultas con semilla fija)
- A* expande entre 83 % y 90 % menos nodos que Dijkstra y es de 2,7 a 5,7 veces más rápido (2.500 a 40.000 nodos), con rutas de igual costo en todas las consultas.
- Replanificar solo cuando el atasco afecta la ruta reduce 93,9 % los recálculos, con una brecha media de 0,35 % frente al óptimo.
- 2-opt reduce la brecha del orden de paradas de 6,18 % a 0,71 % frente al óptimo (8 paradas).

Informe completo (APA 7): `informe/informe.pdf`.
