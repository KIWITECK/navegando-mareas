// Patrón Command: cada acción de navegación es un objeto con ejecutar/deshacer, de modo que el historial permite retroceder.
export class PlanTripCommand {
  constructor(session) { this.session = session; }
  execute() { this.before = this.session.snapshot(); this.session.plan(); }
  undo() { this.session.restore(this.before); }
}
export class AddStopCommand {
  constructor(session, node) { this.session = session; this.node = node; }
  execute() { this.before = this.session.snapshot(); this.session.stops.push(this.node); this.session.plan(); }
  undo() { this.session.restore(this.before); }
}
export class RerouteCommand {
  constructor(session) { this.session = session; }
  execute() { this.before = this.session.snapshot(); this.session.plan(); }
  undo() { this.session.restore(this.before); }
}

export class CommandHistory {
  #done = [];
  #undone = [];
  execute(cmd) { cmd.execute(); this.#done.push(cmd); this.#undone.length = 0; return cmd; }
  undo() { const c = this.#done.pop(); if (!c) return false; c.undo(); this.#undone.push(c); return true; }
  redo() { const c = this.#undone.pop(); if (!c) return false; c.execute(); this.#done.push(c); return true; }
  get depth() { return this.#done.length; }
}
