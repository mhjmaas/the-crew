import { Application, Container, Graphics, Text } from "pixi.js";
import { getAvatar, type CrewState, type MapState, type Vec2 } from "@the-crew/world-core";

const ROOM_COLORS: Record<string, number> = {
  meeting: 0x46536e,
  office: 0x4e5d43,
  kitchen: 0x6e5a46,
  lounge: 0x5d4660,
  hallway: 0x4a4f55,
  storage: 0x545454,
};

export class MapRenderer {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly roomsLayer = new Container();
  private readonly avatarsLayer = new Container();
  private readonly avatars = new Map<string, Container>();
  private map: MapState | null = null;
  private clickHandler: ((pos: Vec2) => void) | null = null;
  private destroyed = false;

  constructor(private readonly host: HTMLElement) {}

  async init(): Promise<void> {
    await this.app.init({ resizeTo: this.host, background: 0x1b1d22, antialias: true });
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }
    this.host.appendChild(this.app.canvas);
    this.world.addChild(this.roomsLayer, this.avatarsLayer);
    this.app.stage.addChild(this.world);
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on("pointertap", (e) => {
      if (!this.map || !this.clickHandler) {
        return;
      }
      const local = this.world.toLocal(e.global);
      this.clickHandler({ x: local.x, y: local.y });
    });
    this.app.ticker.add(() => this.fit());
  }

  setClickHandler(handler: (pos: Vec2) => void): void {
    this.clickHandler = handler;
  }

  setMap(map: MapState): void {
    this.map = map;
    this.roomsLayer.removeChildren();
    for (const room of map.rooms) {
      const shape = new Graphics();
      shape
        .rect(room.rect.x, room.rect.y, room.rect.w, room.rect.h)
        .fill({ color: ROOM_COLORS[room.type] ?? 0x444444, alpha: 0.45 })
        .stroke({ width: 2, color: 0x9aa7b8 });
      this.roomsLayer.addChild(shape);
      const label = new Text({
        text: room.name,
        style: { fontSize: 16, fill: 0xd7dde6, fontWeight: "600" },
      });
      label.position.set(room.rect.x + 10, room.rect.y + 10);
      this.roomsLayer.addChild(label);
    }
    this.fit();
  }

  setInhabitants(inhabitants: CrewState["inhabitants"]): void {
    const seen = new Set<string>();
    for (const inhabitant of inhabitants) {
      seen.add(inhabitant.id);
      let group = this.avatars.get(inhabitant.id);
      if (!group) {
        group = new Container();
        const body = new Graphics();
        body
          .circle(0, 0, 14)
          .fill({ color: getAvatar(inhabitant.avatarId).color })
          .stroke({ width: 2, color: 0xffffff });
        const name = new Text({
          text: inhabitant.name,
          style: { fontSize: 13, fill: 0xffffff },
        });
        name.anchor.set(0.5, 0);
        name.position.set(0, 18);
        group.addChild(body, name);
        this.avatars.set(inhabitant.id, group);
        this.avatarsLayer.addChild(group);
      }
      group.position.set(inhabitant.position.x, inhabitant.position.y);
    }
    for (const [id, group] of this.avatars) {
      if (!seen.has(id)) {
        this.avatarsLayer.removeChild(group);
        group.destroy({ children: true });
        this.avatars.delete(id);
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.app.renderer) {
      this.app.destroy(true, { children: true });
    }
  }

  private fit(): void {
    if (!this.map || !this.app.renderer) {
      return;
    }
    const { width, height } = this.app.screen;
    if (width === 0 || height === 0) {
      return;
    }
    const scale = Math.min(width / this.map.width, height / this.map.height) * 0.98;
    this.world.scale.set(scale);
    this.world.position.set(
      (width - this.map.width * scale) / 2,
      (height - this.map.height * scale) / 2,
    );
  }
}
