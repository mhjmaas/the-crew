# 2D top-down rendering for the Map

The Map is rendered 2D top-down, tile-based with sprite avatars (Gather-style), not 3D.

**Considered options**: 3D scenes you look around in; non-spatial floor-plan navigation.

**Why**: a 3D renderer and asset pipeline is a project of its own and would delay the MVP; the spatial data model (Rooms, positions, proximity) is identical in 2D and 3D, so 3D can be a later skin on the same model.
