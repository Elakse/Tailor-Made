(function () {
  "use strict";

  const FRAME_SIZE = 32;
  const ROCK_SIZE = 24;
  const DEFAULT_PALETTE = [
    "#ff8a3d",
    "#202b38",
    "#ffffff",
    "#59c2ff",
    "#ff4f87",
    "#5dcc84",
    "#ffcc52",
    "#7b69ff",
    "#7a4b2e",
    "#cbc1ad",
    "#76869a",
    "#101820",
  ];
  const HISTORY_LIMIT = 60;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 48;
  const GRID_MIN_ZOOM = 4;
  const DEFAULT_THEME_ACCENT = "#a54d52";
  const THEME_STORAGE_KEY = "tailor-made-accent";
  const FRAME_LABEL_DURATION = 2200;
  const FRAME_LABEL_FADE_DURATION = 560;
  const DUCK_REFERENCE_FILES = { idle: "./idle.png", quack: "./quack.png" };
  const GUIDE_COLORS = {
    Idle: "#58c3ff",
    Quack: "#ff8a3d",
    Cape: "#7b69ff",
    Rock: "#5dcc84",
    Particles: "#ffcc52",
    Meta: "#ff4f87",
  };
  const TEXTURE_PRESETS = {
    checker: {
      image:
        "linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%)," +
        "linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%)," +
        "linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%)," +
        "linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%)",
      size: "10px 10px, 10px 10px, 10px 10px, 10px 10px",
      repeat: "repeat, repeat, repeat, repeat",
      position: "0 0, 0 5px, 5px -5px, -5px 0",
    },
    fabric: {
      image:
        "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)," +
        "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)," +
        "linear-gradient(135deg, rgba(0,0,0,0.05), rgba(255,255,255,0.02))",
      size: "6px 6px, 6px 6px, 100% 100%",
      repeat: "repeat, repeat, no-repeat",
      position: "0 0, 0 0, center",
    },
    paper: {
      image:
        "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)," +
        "radial-gradient(circle at 3px 3px, rgba(0,0,0,0.045) 0.8px, transparent 0)," +
        "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.04))",
      size: "7px 7px, 11px 11px, 100% 100%",
      repeat: "repeat, repeat, no-repeat",
      position: "0 0, 0 0, center",
    },
    blueprint: {
      image:
        "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)," +
        "linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)," +
        "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)," +
        "linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
      size: "10px 10px, 10px 10px, 40px 40px, 40px 40px",
      repeat: "repeat, repeat, repeat, repeat",
      position: "0 0, 0 0, 0 0, 0 0",
    },
    none: {
      image: "none",
      size: "auto",
      repeat: "no-repeat",
      position: "center",
    },
  };

  function rangeField(key, label, dataType, defaultValue, min, max, step) {
    return { key, label, control: "range", dataType, default: defaultValue, min, max, step };
  }

  function selectField(key, label, defaultValue, options) {
    return { key, label, control: "select", dataType: "enum", default: defaultValue, options };
  }

  function literalChannel(label, value) {
    return { label, mode: "literal", value };
  }

  function fieldChannel(label, source, clampMin, clampMax) {
    return { label, mode: "field", source, clampMin, clampMax };
  }

  function normalizedChannel(label, source, min, max, clampMin, clampMax) {
    return { label, mode: "normalized", source, min, max, clampMin, clampMax };
  }

  function centerPlusChannel(label, source, center, clampMin, clampMax) {
    return { label, mode: "center-plus", source, center, clampMin, clampMax };
  }

  function centerMinusChannel(label, source, center, clampMin, clampMax) {
    return { label, mode: "center-minus", source, center, clampMin, clampMax };
  }

  function booleanMeta(id, name, category, description) {
    return {
      id,
      name,
      category,
      description,
      gifPath: "",
      activation: { mode: "boolean", label: "Enable", default: false },
      fields: [],
      channels: {
        r: literalChannel("Metapixel Id", id),
        g: literalChannel("Unused", 0),
        b: literalChannel("Unused", 0),
      },
    };
  }

  function optionalMeta(id, name, category, description, fields, channels) {
    return {
      id,
      name,
      category,
      description,
      gifPath: "",
      activation: { mode: "optional", label: "Active", default: false },
      fields,
      channels,
    };
  }

  function buildFallbackSchema() {
    return {
      version: 2,
      metaColumnWidth: 1,
      categories: [
        { id: "Hat", label: "Hat", availability: "always", description: "Always available on every hat sheet." },
        { id: "Quack", label: "Quack", availability: "quack", description: "Available when the sheet includes a quack frame." },
        { id: "Cape", label: "Cape", availability: "cape", description: "Available when the cape frame is present." },
        { id: "Particle", label: "Particle", availability: "particles", description: "Available when particle space is reserved." },
      ],
      definitions: [
        booleanMeta(0, "HatIsTail", "Hat", "Enables the hat-tail behavior."),
        optionalMeta(
          1,
          "HatOffset",
          "Hat",
          "Offsets the hat horizontally and vertically in pixels.",
          [rangeField("x", "X Offset", "integer", 0, -16, 16, 1), rangeField("y", "Y Offset", "integer", 0, -16, 16, 1)],
          {
            r: literalChannel("Metapixel Id", 1),
            g: centerPlusChannel("Horizontal Offset", "x", 128, 112, 144),
            b: centerPlusChannel("Vertical Offset", "y", 128, 112, 144),
          }
        ),
        booleanMeta(2, "UseDuckColor", "Hat", "Maps white and gray hat pixels to the duck palette."),
        booleanMeta(3, "HatNoFlip", "Hat", "Prevents the hat from flipping when the duck turns."),
        optionalMeta(
          60,
          "QuackDelay",
          "Quack",
          "Delay in seconds before the quack frame appears.",
          [rangeField("value", "Delay", "float", 0, 0, 2, 0.01)],
          {
            r: literalChannel("Metapixel Id", 60),
            g: normalizedChannel("Delay", "value", 0, 2, 0, 255),
            b: literalChannel("Unused", 0),
          }
        ),
        optionalMeta(
          61,
          "QuackHold",
          "Quack",
          "Minimum time in seconds that the quack frame is held.",
          [rangeField("value", "Hold", "float", 0, 0, 2, 0.01)],
          {
            r: literalChannel("Metapixel Id", 61),
            g: normalizedChannel("Hold", "value", 0, 2, 0, 255),
            b: literalChannel("Unused", 0),
          }
        ),
        booleanMeta(62, "QuackSuppressRequack", "Quack", "Prevents re-quacking until the animation finishes."),
        booleanMeta(70, "WetLips", "Quack", "Changes the quack sound effect to wet lips."),
        booleanMeta(71, "MechanicalLips", "Quack", "Changes the quack sound effect to mechanical lips."),
        optionalMeta(
          10,
          "CapeOffset",
          "Cape",
          "Offsets the cape horizontally and vertically in pixels.",
          [rangeField("x", "X Offset", "integer", 0, -16, 16, 1), rangeField("y", "Y Offset", "integer", 0, -16, 16, 1)],
          {
            r: literalChannel("Metapixel Id", 10),
            g: centerPlusChannel("Horizontal Offset", "x", 128, 112, 144),
            b: centerPlusChannel("Vertical Offset", "y", 128, 112, 144),
          }
        ),
        booleanMeta(11, "CapeIsForeground", "Cape", "Draws the cape in front of the duck."),
        optionalMeta(
          12,
          "CapeSwayModifier",
          "Cape",
          "Controls cape sway and length modifiers.",
          [rangeField("sway", "Sway", "float", 0, -1, 1, 0.01), rangeField("length", "Length", "float", 0, -1, 1, 0.01)],
          {
            r: literalChannel("Metapixel Id", 12),
            g: normalizedChannel("Sway", "sway", -1, 1, 0, 255),
            b: normalizedChannel("Length", "length", -1, 1, 0, 255),
          }
        ),
        optionalMeta(
          13,
          "CapeWiggleModifier",
          "Cape",
          "Affects wind wiggle for the cape.",
          [rangeField("wiggle", "Wiggle", "float", 0, -1, 1, 0.01)],
          {
            r: literalChannel("Metapixel Id", 13),
            g: normalizedChannel("Wiggle", "wiggle", -1, 1, 0, 255),
            b: literalChannel("Unused", 0),
          }
        ),
        optionalMeta(
          14,
          "CapeTaperStart",
          "Cape",
          "Controls cape narrowness at the top.",
          [rangeField("value", "Top Taper", "float", 0, 0, 1, 0.01)],
          {
            r: literalChannel("Metapixel Id", 14),
            g: normalizedChannel("Top Taper", "value", 0, 1, 0, 255),
            b: literalChannel("Unused", 0),
          }
        ),
        optionalMeta(
          15,
          "CapeTaperEnd",
          "Cape",
          "Controls cape narrowness at the bottom.",
          [rangeField("value", "Bottom Taper", "float", 0, 0, 1, 0.01)],
          {
            r: literalChannel("Metapixel Id", 15),
            g: normalizedChannel("Bottom Taper", "value", 0, 1, 0, 255),
            b: literalChannel("Unused", 0),
          }
        ),
        optionalMeta(
          16,
          "CapeAlphaStart",
          "Cape",
          "Controls cape opacity at the top.",
          [rangeField("value", "Top Alpha", "float", 0, 0, 1, 0.01)],
          {
            r: literalChannel("Metapixel Id", 16),
            g: normalizedChannel("Top Alpha", "value", 0, 1, 0, 255),
            b: literalChannel("Unused", 0),
          }
        ),
        optionalMeta(
          17,
          "CapeAlphaEnd",
          "Cape",
          "Controls cape opacity at the bottom.",
          [rangeField("value", "Bottom Alpha", "float", 0, 0, 1, 0.01)],
          {
            r: literalChannel("Metapixel Id", 17),
            g: normalizedChannel("Bottom Alpha", "value", 0, 1, 0, 255),
            b: literalChannel("Unused", 0),
          }
        ),
        booleanMeta(20, "CapeIsTrail", "Cape", "Turns the cape into a trail effect."),
        optionalMeta(
          30,
          "ParticleEmitterOffset",
          "Particle",
          "Offsets the particle spawn point from the hat center.",
          [rangeField("x", "X Offset", "integer", 0, -16, 16, 1), rangeField("y", "Y Offset", "integer", 0, -16, 16, 1)],
          {
            r: literalChannel("Metapixel Id", 30),
            g: centerPlusChannel("Horizontal Offset", "x", 128, 112, 144),
            b: centerPlusChannel("Vertical Offset", "y", 128, 112, 144),
          }
        ),
        optionalMeta(
          31,
          "ParticleDefaultBehavior",
          "Particle",
          "Overrides the rest of the particle settings with a predefined behavior.",
          [selectField("behavior", "Behavior", 0, [{ label: "No Behavior", value: 0 }, { label: "Spit", value: 1 }, { label: "Burst", value: 2 }, { label: "Halo", value: 3 }, { label: "Exclamation", value: 4 }])],
          {
            r: literalChannel("Metapixel Id", 31),
            g: fieldChannel("Behavior", "behavior", 0, 255),
            b: literalChannel("Unused", 0),
          }
        ),
        optionalMeta(
          32,
          "ParticleEmitShape",
          "Particle",
          "Chooses the emitter shape and how particles spawn from it.",
          [
            selectField("shape", "Shape", 0, [{ label: "Point", value: 0 }, { label: "Circle", value: 1 }, { label: "Box", value: 2 }]),
            selectField("spawnRelation", "Spawn Relation", 0, [{ label: "Border Random", value: 0 }, { label: "Fill Random", value: 1 }, { label: "Border Uniform", value: 2 }])
          ],
          {
            r: literalChannel("Metapixel Id", 32),
            g: fieldChannel("Shape", "shape", 0, 255),
            b: fieldChannel("Spawn Relation", "spawnRelation", 0, 255),
          }
        ),
        optionalMeta(
          33,
          "ParticleEmitShapeSize",
          "Particle",
          "Sets the width and height of the particle emitter in pixels.",
          [rangeField("width", "Width", "integer", 0, 0, 24, 1), rangeField("height", "Height", "integer", 0, 0, 24, 1)],
          {
            r: literalChannel("Metapixel Id", 33),
            g: centerMinusChannel("Emitter Width", "width", 128, 104, 128),
            b: centerMinusChannel("Emitter Height", "height", 128, 104, 128),
          }
        ),
        optionalMeta(
          34,
          "ParticleCount",
          "Particle",
          "Sets how many particles spawn per quack.",
          [rangeField("count", "Count", "integer", 0, 0, 8, 1)],
          {
            r: literalChannel("Metapixel Id", 34),
            g: fieldChannel("Count", "count", 0, 255),
            b: literalChannel("Unused", 0),
          }
        ),
        optionalMeta(
          35,
          "ParticleLifespan",
          "Particle",
          "Sets the particle lifespan in seconds.",
          [rangeField("value", "Lifespan", "float", 0, 0, 2, 0.01)],
          {
            r: literalChannel("Metapixel Id", 35),
            g: normalizedChannel("Lifespan", "value", 0, 2, 0, 255),
            b: literalChannel("Unused", 0),
          }
        ),
        optionalMeta(
          36,
          "ParticleVelocity",
          "Particle",
          "Sets the initial particle velocity.",
          [rangeField("x", "Velocity X", "float", 0, -1, 1, 0.01), rangeField("y", "Velocity Y", "float", 0, -1, 1, 0.01)],
          {
            r: literalChannel("Metapixel Id", 36),
            g: normalizedChannel("Velocity X", "x", -1, 1, 0, 255),
            b: normalizedChannel("Velocity Y", "y", -1, 1, 0, 255),
          }
        ),
        optionalMeta(
          38,
          "ParticleFriction",
          "Particle",
          "Sets per-frame friction on both axes.",
          [rangeField("x", "Friction X", "float", 0, 0, 2, 0.01), rangeField("y", "Friction Y", "float", 0, 0, 2, 0.01)],
          {
            r: literalChannel("Metapixel Id", 38),
            g: normalizedChannel("Friction X", "x", 0, 2, 0, 255),
            b: normalizedChannel("Friction Y", "y", 0, 2, 0, 255),
          }
        ),
        optionalMeta(
          39,
          "ParticleAlpha",
          "Particle",
          "Sets start and end alpha for particles.",
          [rangeField("start", "Start Alpha", "float", 0, 0, 2, 0.01), rangeField("end", "End Alpha", "float", 0, 0, 2, 0.01)],
          {
            r: literalChannel("Metapixel Id", 39),
            g: normalizedChannel("Start Alpha", "start", 0, 2, 0, 255),
            b: normalizedChannel("End Alpha", "end", 0, 2, 0, 255),
          }
        ),
        booleanMeta(45, "ParticleAnimated", "Particle", "Animates particles through the four particle frames."),
        booleanMeta(46, "ParticleAnimationLoop", "Particle", "Loops the four-frame particle animation."),
        booleanMeta(47, "ParticleAnimationRandomFrame", "Particle", "Starts animated particles on a random frame."),
        optionalMeta(
          48,
          "ParticleAnimationSpeed",
          "Particle",
          "Controls the speed of the particle frame animation.",
          [rangeField("value", "Animation Speed", "float", 0, 0, 1, 0.01)],
          {
            r: literalChannel("Metapixel Id", 48),
            g: normalizedChannel("Animation Speed", "value", 0, 1, 0, 255),
            b: literalChannel("Unused", 0),
          }
        ),
        booleanMeta(49, "ParticleAnchorOrientation", "Particle", "Orients particles using the hat rotation."),
      ],
    };
  }

  const FALLBACK_SCHEMA = buildFallbackSchema();

  function createDefaultBackgroundState() {
    return {
      texture: "checker",
      color: "#16263a",
      imageDataUrl: "",
      imageName: "",
    };
  }

  const elements = {
    undoBtn: document.getElementById("undoBtn"),
    redoBtn: document.getElementById("redoBtn"),
    fitViewBtn: document.getElementById("fitViewBtn"),
    importHatBtn: document.getElementById("importHatBtn"),
    importHatInput: document.getElementById("importHatInput"),
    downloadBtn: document.getElementById("downloadBtn"),
    accentThemeBtn: document.getElementById("accentThemeBtn"),
    accentThemeInput: document.getElementById("accentThemeInput"),
    addLayerBtn: document.getElementById("addLayerBtn"),
    infoTabBtn: document.getElementById("infoTabBtn"),
    layerList: document.getElementById("layerList"),
    tabStrip: document.getElementById("tabStrip"),
    editorShell: document.getElementById("editorShell"),
    toolReadout: document.getElementById("toolReadout"),
    zoomReadout: document.getElementById("zoomReadout"),
    historyReadout: document.getElementById("historyReadout"),
    controlTray: document.getElementById("controlTray"),
    layoutSelect: document.getElementById("layoutSelect"),
    setupArtSizeLabel: document.getElementById("setupArtSizeLabel"),
    setupExportSizeLabel: document.getElementById("setupExportSizeLabel"),
    rockToggle: document.getElementById("rockToggle"),
    particlesToggle: document.getElementById("particlesToggle"),
    toolButtons: document.getElementById("toolButtons"),
    colorInput: document.getElementById("colorInput"),
    colorValue: document.getElementById("colorValue"),
    saveColorBtn: document.getElementById("saveColorBtn"),
    pasteSelectionBtn: document.getElementById("pasteSelectionBtn"),
    paletteGrid: document.getElementById("paletteGrid"),
    backgroundTextureSelect: document.getElementById("backgroundTextureSelect"),
    backgroundColorInput: document.getElementById("backgroundColorInput"),
    backgroundColorValue: document.getElementById("backgroundColorValue"),
    uploadBackgroundBtn: document.getElementById("uploadBackgroundBtn"),
    clearBackgroundBtn: document.getElementById("clearBackgroundBtn"),
    backgroundImageName: document.getElementById("backgroundImageName"),
    backgroundImageInput: document.getElementById("backgroundImageInput"),
    gridToggle: document.getElementById("gridToggle"),
    guidesToggle: document.getElementById("guidesToggle"),
    duckReferenceToggle: document.getElementById("duckReferenceToggle"),
    particlePrompt: document.getElementById("particlePrompt"),
    openMetapixelsPromptBtn: document.getElementById("openMetapixelsPromptBtn"),
    selectionActionCard: document.getElementById("selectionActionCard"),
    selectionCopyBtn: document.getElementById("selectionCopyBtn"),
    selectionCutBtn: document.getElementById("selectionCutBtn"),
    selectionDeleteBtn: document.getElementById("selectionDeleteBtn"),
    activeLayerReadout: document.getElementById("activeLayerReadout"),
    viewport: document.getElementById("viewport"),
    stage: document.getElementById("stage"),
    stageSurface: document.getElementById("stageSurface"),
    referenceCanvas: document.getElementById("referenceCanvas"),
    guideCanvas: document.getElementById("guideCanvas"),
    layerStack: document.getElementById("layerStack"),
    overlayCanvas: document.getElementById("overlayCanvas"),
    metaPreview: document.getElementById("metaPreview"),
    metaModalBackdrop: document.getElementById("metaModalBackdrop"),
    closeMetaModalBtn: document.getElementById("closeMetaModalBtn"),
    metaCategoryFilters: document.getElementById("metaCategoryFilters"),
    metaDefinitionSelect: document.getElementById("metaDefinitionSelect"),
    metaDefinitionName: document.getElementById("metaDefinitionName"),
    metaDefinitionDescription: document.getElementById("metaDefinitionDescription"),
    metaControls: document.getElementById("metaControls"),
    activeMetaList: document.getElementById("activeMetaList"),
    resetMetaBtn: document.getElementById("resetMetaBtn"),
    doneMetaBtn: document.getElementById("doneMetaBtn"),
  };

  const overlayContext = elements.overlayCanvas.getContext("2d");
  overlayContext.imageSmoothingEnabled = false;
  const referenceContext = elements.referenceCanvas.getContext("2d");
  referenceContext.imageSmoothingEnabled = false;
  const guideContext = elements.guideCanvas.getContext("2d");
  guideContext.imageSmoothingEnabled = false;

  const state = {
    activeTab: null,
    drawerAnchor: null,
    layoutMode: "basic",
    includeRock: false,
    includeParticles: false,
    showGrid: true,
    showGuides: true,
    showDuckReference: true,
    tool: "pen",
    themeAccent: DEFAULT_THEME_ACCENT,
    lastDrawTool: "pen",
    tempToolReturn: null,
    activeColor: "#ff8a3d",
    palette: loadPalette(),
    background: createDefaultBackgroundState(),
    duckReferenceAssets: { idle: null, quack: null, hasAny: false },
    layers: [],
    activeLayerId: null,
    selection: null,
    clipboardSelection: null,
    layerCounter: 0,
    metaSchema: FALLBACK_SCHEMA,
    metapixelDefs: [],
    metapixelSource: "Loading...",
    metapixelValues: {},
    metaSelection: null,
    metaCategoryFilter: "all",
    isMetaModalOpen: false,
    sheet: { artWidth: FRAME_SIZE, exportWidth: FRAME_SIZE, height: FRAME_SIZE, hasMeta: false, activeMetapixels: [] },
    zoom: 12,
    panX: 0,
    panY: 0,
    hasFittedView: false,
    pointer: { drawing: false, panning: false, pointerId: null, lastCanvasPoint: null, lastClientX: 0, lastClientY: 0, strokeDirty: false, selectionStart: null, selectionCurrent: null, selectionMoveOffsetX: 0, selectionMoveOffsetY: 0, selectionMoveOriginX: 0, selectionMoveOriginY: 0 },
    isSpaceHeld: false,
    isAltHeld: false,
    history: { undo: [], redo: [] },
    isRestoringHistory: false,
  };

  let frameLabelsVisibleUntil = 0;
  let frameLabelAnimationFrame = 0;

  function loadPalette() {
    try {
      const raw = window.localStorage.getItem("duck-game-hat-palette");
      if (!raw) {
        return DEFAULT_PALETTE.slice();
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) {
        return DEFAULT_PALETTE.slice();
      }
      return parsed.slice(0, 18);
    } catch (error) {
      return DEFAULT_PALETTE.slice();
    }
  }

  function persistPalette() {
    try {
      window.localStorage.setItem("duck-game-hat-palette", JSON.stringify(state.palette));
    } catch (error) {
      return;
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeBackgroundState(background) {
    const defaults = createDefaultBackgroundState();
    const nextBackground = Object.assign({}, defaults, background && typeof background === "object" ? background : {});
    nextBackground.texture = TEXTURE_PRESETS[nextBackground.texture] ? nextBackground.texture : defaults.texture;
    nextBackground.color = String(nextBackground.color || defaults.color).toLowerCase();
    nextBackground.imageDataUrl = String(nextBackground.imageDataUrl || "");
    nextBackground.imageName = String(nextBackground.imageName || "");
    return nextBackground;
  }

  function cloneSimple(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function toUpperHex(hexColor) {
    return String(hexColor).toUpperCase();
  }

  function normalizeHexColor(color, fallback) {
    const safeFallback = String(fallback || DEFAULT_THEME_ACCENT).toLowerCase();
    const match = String(color || "").trim().toLowerCase().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) {
      return safeFallback;
    }
    const raw = match[1];
    if (raw.length === 3) {
      return "#" + raw.split("").map(function (character) {
        return character + character;
      }).join("");
    }
    return "#" + raw;
  }

  function hexToRgbChannels(hexColor) {
    const normalized = normalizeHexColor(hexColor, DEFAULT_THEME_ACCENT).replace("#", "");
    return {
      red: parseInt(normalized.slice(0, 2), 16),
      green: parseInt(normalized.slice(2, 4), 16),
      blue: parseInt(normalized.slice(4, 6), 16),
    };
  }

  function rgbChannelsToHex(red, green, blue) {
    return "#" + [red, green, blue].map(function (channel) {
      const safeChannel = clamp(Math.round(channel), 0, 255);
      return safeChannel.toString(16).padStart(2, "0");
    }).join("");
  }

  function mixHexColors(baseHex, targetHex, amount) {
    const safeAmount = clamp(Number(amount) || 0, 0, 1);
    const base = hexToRgbChannels(baseHex);
    const target = hexToRgbChannels(targetHex);
    return rgbChannelsToHex(
      base.red + (target.red - base.red) * safeAmount,
      base.green + (target.green - base.green) * safeAmount,
      base.blue + (target.blue - base.blue) * safeAmount
    );
  }

  function loadAccentTheme() {
    try {
      return normalizeHexColor(window.localStorage.getItem(THEME_STORAGE_KEY), DEFAULT_THEME_ACCENT);
    } catch (error) {
      return DEFAULT_THEME_ACCENT;
    }
  }

  function applyAccentTheme(color) {
    const accent = normalizeHexColor(color, DEFAULT_THEME_ACCENT);
    const accentStrong = mixHexColors(accent, "#f4d4d6", 0.22);
    const accentDeep = mixHexColors(accent, "#2b1517", 0.26);
    const accentRgb = hexToRgbChannels(accent);
    const rootStyle = document.documentElement.style;
    state.themeAccent = accent;
    rootStyle.setProperty("--theme-accent", accent);
    rootStyle.setProperty("--theme-accent-strong", accentStrong);
    rootStyle.setProperty("--theme-accent-deep", accentDeep);
    rootStyle.setProperty("--theme-accent-rgb", accentRgb.red + ", " + accentRgb.green + ", " + accentRgb.blue);
    if (elements.accentThemeInput) {
      elements.accentThemeInput.value = accent;
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, accent);
    } catch (error) {
      return;
    }
  }

  function formatNumber(value, digits) {
    if (Number.isInteger(value)) {
      return String(value);
    }
    return Number(value).toFixed(digits);
  }

  function createCanvasContext(canvas) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.imageSmoothingEnabled = false;
    return context;
  }

  function hexToRgba(hex, alpha) {
    const normalized = String(hex).replace("#", "");
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    return "rgba(" + red + ", " + green + ", " + blue + ", " + alpha + ")";
  }

  function getToolLabel(tool) {
    if (tool === "select") {
      return "Select";
    }
    if (tool === "eraser") {
      return "Eraser";
    }
    if (tool === "picker") {
      return "Picker";
    }
    return "Pen";
  }

  function getActiveLayer() {
    return state.layers.find(function (layer) {
      return layer.id === state.activeLayerId;
    }) || state.layers[state.layers.length - 1] || null;
  }

  function getLayerById(layerId) {
    return state.layers.find(function (layer) {
      return layer.id === layerId;
    }) || null;
  }

  function getCategoryById(categoryId) {
    return state.metaSchema.categories.find(function (category) {
      return category.id === categoryId;
    }) || null;
  }

  function getDefinitionById(definitionId) {
    return state.metapixelDefs.find(function (definition) {
      return definition.id === Number(definitionId);
    }) || null;
  }

  function isValidSchema(schema) {
    if (!schema || typeof schema !== "object") {
      return false;
    }
    if (!Array.isArray(schema.categories) || !Array.isArray(schema.definitions)) {
      return false;
    }
    return schema.categories.every(function (category) {
      return category && category.id && category.label;
    }) && schema.definitions.every(function (definition) {
      return definition && typeof definition.id === "number" && definition.name && definition.category;
    });
  }

  async function loadMetapixelSchema() {
    try {
      const response = await fetch("./metapixels.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to read metapixels.json");
      }
      const schema = await response.json();
      if (!isValidSchema(schema)) {
        throw new Error("Invalid metapixel schema");
      }
      state.metapixelSource = "Loaded from metapixels.json";
      return schema;
    } catch (error) {
      state.metapixelSource = "Embedded fallback";
      return cloneSimple(FALLBACK_SCHEMA);
    }
  }

  function loadEditorImage(sourcePath) {
    return new Promise(function (resolve) {
      const image = new Image();
      image.onload = function () {
        resolve(image);
      };
      image.onerror = function () {
        resolve(null);
      };
      image.src = sourcePath;
    });
  }

  async function loadDuckReferenceAssets() {
    const [idle, quack] = await Promise.all([
      loadEditorImage(DUCK_REFERENCE_FILES.idle),
      loadEditorImage(DUCK_REFERENCE_FILES.quack),
    ]);
    state.duckReferenceAssets = {
      idle: idle,
      quack: quack,
      hasAny: Boolean(idle || quack),
    };
    if (!state.duckReferenceAssets.hasAny) {
      state.showDuckReference = false;
    }
  }

  function createDefaultMetapixelValue(definition) {
    const value = { enabled: Boolean(definition.activation && definition.activation.default) };
    (definition.fields || []).forEach(function (field) {
      value[field.key] = field.default;
    });
    return value;
  }

  function normalizeFieldValue(field, nextValue) {
    const numericValue = field.dataType === "integer" || field.dataType === "enum" ? Math.round(Number(nextValue)) : Number(nextValue);
    const prepared = Number.isFinite(numericValue) ? numericValue : field.default;
    if (field.dataType === "enum") {
      return prepared;
    }
    return clamp(prepared, Number(field.min), Number(field.max));
  }

  function normalizeMetapixelValue(definition, existingValue) {
    const baseValue = createDefaultMetapixelValue(definition);
    if (!existingValue || typeof existingValue !== "object") {
      return baseValue;
    }
    baseValue.enabled = typeof existingValue.enabled === "boolean" ? existingValue.enabled : baseValue.enabled;
    (definition.fields || []).forEach(function (field) {
      if (existingValue[field.key] == null) {
        return;
      }
      baseValue[field.key] = normalizeFieldValue(field, existingValue[field.key]);
    });
    return baseValue;
  }

  function applySchema(schema) {
    const categoryOrder = new Map(schema.categories.map(function (category, index) {
      return [category.id, index];
    }));
    state.metaSchema = schema;
    state.metapixelDefs = schema.definitions.slice().sort(function (left, right) {
      const leftOrder = categoryOrder.get(left.category) == null ? 999 : categoryOrder.get(left.category);
      const rightOrder = categoryOrder.get(right.category) == null ? 999 : categoryOrder.get(right.category);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.id - right.id;
    });
    const nextValues = {};
    state.metapixelDefs.forEach(function (definition) {
      nextValues[definition.id] = normalizeMetapixelValue(definition, state.metapixelValues[definition.id]);
    });
    state.metapixelValues = nextValues;
    if (!getDefinitionById(state.metaSelection)) {
      state.metaSelection = chooseDefaultMetapixelId();
    }
  }

  function getCategoryAvailability(categoryId) {
    const category = getCategoryById(categoryId);
    const availability = category && category.availability ? category.availability : "always";
    if (availability === "quack") {
      return { available: state.layoutMode !== "basic", reason: state.layoutMode !== "basic" ? "Ready" : "Needs Common Hat or Cape layout" };
    }
    if (availability === "cape") {
      return { available: state.layoutMode === "cape", reason: state.layoutMode === "cape" ? "Ready" : "Needs Cape layout" };
    }
    if (availability === "particles") {
      return { available: state.includeParticles, reason: state.includeParticles ? "Ready" : "Needs Particles enabled" };
    }
    return { available: true, reason: "Ready" };
  }

  function getDefinitionAvailability(definition) {
    return getCategoryAvailability(definition.category);
  }

  function chooseDefaultMetapixelId() {
    const preferredCategory = state.includeParticles ? "Particle" : state.layoutMode === "cape" ? "Cape" : "Hat";
    const preferredDefinition = state.metapixelDefs.find(function (definition) {
      return definition.category === preferredCategory;
    });
    if (preferredDefinition) {
      return preferredDefinition.id;
    }
    return state.metapixelDefs.length ? state.metapixelDefs[0].id : null;
  }

  function computeBaseSheet(layoutMode, includeRock, includeParticles) {
    let artWidth = FRAME_SIZE;
    if (layoutMode === "common") {
      artWidth = FRAME_SIZE * 2;
    } else if (layoutMode === "cape") {
      artWidth = FRAME_SIZE * 3;
    }
    const height = includeRock || includeParticles ? FRAME_SIZE + ROCK_SIZE : FRAME_SIZE;
    return { artWidth, height };
  }

  function syncFeatureConstraints() {
    if (state.includeParticles) {
      state.includeRock = true;
      if (state.layoutMode === "basic") {
        state.layoutMode = "common";
      }
    }
  }

  function encodeChannel(channel, value) {
    if (!channel) {
      return 0;
    }
    if (channel.mode === "literal") {
      return clamp(Math.round(Number(channel.value) || 0), 0, 255);
    }
    const sourceValue = Number(value[channel.source]);
    const safeSource = Number.isFinite(sourceValue) ? sourceValue : 0;
    if (channel.mode === "field") {
      return clamp(Math.round(safeSource), channel.clampMin == null ? 0 : channel.clampMin, channel.clampMax == null ? 255 : channel.clampMax);
    }
    if (channel.mode === "center-plus") {
      return clamp(Math.round((channel.center == null ? 128 : channel.center) + safeSource), channel.clampMin == null ? 0 : channel.clampMin, channel.clampMax == null ? 255 : channel.clampMax);
    }
    if (channel.mode === "center-minus") {
      return clamp(Math.round((channel.center == null ? 128 : channel.center) - safeSource), channel.clampMin == null ? 0 : channel.clampMin, channel.clampMax == null ? 255 : channel.clampMax);
    }
    if (channel.mode === "normalized") {
      const min = Number(channel.min == null ? 0 : channel.min);
      const max = Number(channel.max == null ? 1 : channel.max);
      const ratio = max === min ? 0 : (safeSource - min) / (max - min);
      return clamp(Math.round(clamp(ratio, 0, 1) * 255), channel.clampMin == null ? 0 : channel.clampMin, channel.clampMax == null ? 255 : channel.clampMax);
    }
    return 0;
  }

  function encodeDefinition(definition, value) {
    if (!value || !value.enabled) {
      return null;
    }
    return {
      r: encodeChannel(definition.channels.r, value),
      g: encodeChannel(definition.channels.g, value),
      b: encodeChannel(definition.channels.b, value),
    };
  }

  function getEncodedMetapixels() {
    return state.metapixelDefs
      .filter(function (definition) {
        return getDefinitionAvailability(definition).available;
      })
      .map(function (definition) {
        const encoded = encodeDefinition(definition, state.metapixelValues[definition.id]);
        if (!encoded) {
          return null;
        }
        return { id: definition.id, name: definition.name, category: definition.category, r: encoded.r, g: encoded.g, b: encoded.b, row: 0 };
      })
      .filter(Boolean)
      .sort(function (left, right) {
        return left.r - right.r;
      })
      .map(function (pixel, index) {
        pixel.row = index;
        return pixel;
      });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ""));
      };
      reader.onerror = function () {
        reject(new Error("Unable to read that file."));
      };
      reader.readAsDataURL(file);
    });
  }

  function getFileStem(fileName) {
    const stem = String(fileName || "").replace(/\.[^/.]+$/, "").trim();
    return stem || "Imported Hat";
  }

  function isPngFile(file) {
    if (!file) {
      return false;
    }
    const fileName = String(file.name || "").toLowerCase();
    return file.type === "image/png" || fileName.endsWith(".png");
  }

  function detectImportedHatSpec(width, height) {
    const allowedArtWidths = [FRAME_SIZE, FRAME_SIZE * 2, FRAME_SIZE * 3];
    const hasMeta = allowedArtWidths.some(function (candidateWidth) {
      return width === candidateWidth + 1;
    });
    const artWidth = hasMeta
      ? allowedArtWidths.find(function (candidateWidth) {
          return width === candidateWidth + 1;
        })
      : allowedArtWidths.find(function (candidateWidth) {
          return width === candidateWidth;
        });
    if (!artWidth) {
      return null;
    }
    if (height !== FRAME_SIZE && height !== FRAME_SIZE + ROCK_SIZE) {
      return null;
    }
    return {
      artWidth: artWidth,
      height: height,
      hasMeta: hasMeta,
      metaX: artWidth,
      layoutMode: artWidth === FRAME_SIZE ? "basic" : artWidth === FRAME_SIZE * 2 ? "common" : "cape",
      includeRock: height === FRAME_SIZE + ROCK_SIZE,
      includeParticles: false,
    };
  }

  function getChannelEntryForField(definition, fieldKey) {
    return ["r", "g", "b"].map(function (channelKey) {
      return { key: channelKey, channel: definition.channels[channelKey] };
    }).find(function (entry) {
      return entry.channel && entry.channel.source === fieldKey;
    }) || null;
  }

  function decodeFieldValueFromChannel(field, channel, encodedValue) {
    const numericValue = clamp(Math.round(Number(encodedValue) || 0), 0, 255);
    if (channel.mode === "field") {
      return normalizeFieldValue(field, numericValue);
    }
    if (channel.mode === "center-plus") {
      return normalizeFieldValue(field, numericValue - (channel.center == null ? 128 : channel.center));
    }
    if (channel.mode === "center-minus") {
      return normalizeFieldValue(field, (channel.center == null ? 128 : channel.center) - numericValue);
    }
    if (channel.mode === "normalized") {
      const min = Number(channel.min == null ? 0 : channel.min);
      const max = Number(channel.max == null ? 1 : channel.max);
      const ratio = numericValue / 255;
      return normalizeFieldValue(field, min + ratio * (max - min));
    }
    return field.default;
  }

  function decodeDefinitionFromPixel(definition, pixel) {
    const value = createDefaultMetapixelValue(definition);
    value.enabled = true;
    (definition.fields || []).forEach(function (field) {
      const channelEntry = getChannelEntryForField(definition, field.key);
      if (!channelEntry) {
        return;
      }
      value[field.key] = decodeFieldValueFromChannel(field, channelEntry.channel, pixel[channelEntry.key]);
    });
    return value;
  }

  function decodeImportedMetapixels(sourceContext, importSpec) {
    const decodedValues = {};
    const seenDefinitions = new Set();
    let hasParticleMetapixels = false;
    if (!importSpec.hasMeta) {
      return { values: decodedValues, hasParticleMetapixels: false };
    }
    for (let row = 0; row < importSpec.height; row += 1) {
      const channels = sourceContext.getImageData(importSpec.metaX, row, 1, 1).data;
      if (!channels[3]) {
        continue;
      }
      const definition = getDefinitionById(channels[0]);
      if (!definition || seenDefinitions.has(definition.id)) {
        continue;
      }
      seenDefinitions.add(definition.id);
      decodedValues[definition.id] = decodeDefinitionFromPixel(definition, {
        r: channels[0],
        g: channels[1],
        b: channels[2],
      });
      if (definition.category === "Particle") {
        hasParticleMetapixels = true;
      }
    }
    return { values: decodedValues, hasParticleMetapixels: hasParticleMetapixels };
  }

  function buildImportedMetapixelState(decodedValues) {
    const nextValues = {};
    state.metapixelDefs.forEach(function (definition) {
      nextValues[definition.id] = normalizeMetapixelValue(definition, decodedValues[definition.id]);
    });
    return nextValues;
  }

  async function loadImportedHat(file) {
    if (!isPngFile(file)) {
      throw new Error("Please choose a PNG hat sheet.");
    }
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadEditorImage(dataUrl);
    if (!image) {
      throw new Error("Unable to read that PNG file.");
    }
    const importSpec = detectImportedHatSpec(image.naturalWidth || image.width, image.naturalHeight || image.height);
    if (!importSpec) {
      throw new Error("Unsupported hat size. Use 32x32, 64x32, 96x32, 32x56, 64x56, 96x56, or those widths plus 1 for metapixels.");
    }
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = image.naturalWidth || image.width;
    sourceCanvas.height = image.naturalHeight || image.height;
    const sourceContext = createCanvasContext(sourceCanvas);
    sourceContext.drawImage(image, 0, 0);
    const decodedMetapixels = decodeImportedMetapixels(sourceContext, importSpec);
    importSpec.includeParticles = Boolean(decodedMetapixels.hasParticleMetapixels && importSpec.height === FRAME_SIZE + ROCK_SIZE && importSpec.artWidth >= FRAME_SIZE * 2);
    return {
      layerName: getFileStem(file.name),
      spec: importSpec,
      artImageData: sourceContext.getImageData(0, 0, importSpec.artWidth, importSpec.height),
      metapixelValues: buildImportedMetapixelState(decodedMetapixels.values),
    };
  }

  function drawImageDataOnLayer(layer, imageData) {
    layer.context.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.context.putImageData(imageData, 0, 0);
  }

  async function importHatFile(file) {
    try {
      const importedHat = await loadImportedHat(file);
      const matchesCurrentArtSize = importedHat.spec.artWidth === state.sheet.artWidth && importedHat.spec.height === state.sheet.height;
      state.layoutMode = importedHat.spec.layoutMode;
      state.includeRock = importedHat.spec.includeRock;
      state.includeParticles = importedHat.spec.includeParticles;
      state.metapixelValues = cloneSimple(importedHat.metapixelValues);

      if (!matchesCurrentArtSize) {
        state.layers = [];
        state.layerCounter = 0;
        state.activeLayerId = null;
        applySheetMetrics({ fitView: true, revealFrameLabels: true });
      } else {
        applySheetMetrics();
      }

      const layer = addLayer({ name: importedHat.layerName, skipHistory: true });
      drawImageDataOnLayer(layer, importedHat.artImageData);
      syncLayerStack();
      renderLayerList();
      renderStats();
      commitHistory();
    } catch (error) {
      window.alert(error && error.message ? error.message : "Unable to import that hat.");
    }
  }

  function createLayer(name, id, width, height) {
    const nextId = id == null ? state.layerCounter + 1 : id;
    state.layerCounter = Math.max(state.layerCounter, nextId);
    const canvas = document.createElement("canvas");
    canvas.width = width == null ? state.sheet.artWidth : width;
    canvas.height = height == null ? state.sheet.height : height;
    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";
    canvas.dataset.layerId = String(nextId);
    return {
      id: nextId,
      name,
      visible: true,
      opacity: 1,
      canvas,
      context: createCanvasContext(canvas),
    };
  }

  function syncLayerStack() {
    elements.layerStack.style.width = state.sheet.artWidth + "px";
    elements.layerStack.style.height = state.sheet.height + "px";
    elements.layerStack.replaceChildren();
    state.layers.forEach(function (layer, index) {
      layer.canvas.style.zIndex = String(index + 1);
      layer.canvas.style.display = layer.visible ? "block" : "none";
      layer.canvas.style.opacity = String(layer.opacity);
      elements.layerStack.appendChild(layer.canvas);
    });
  }

  function resizeLayerCanvases() {
    state.layers.forEach(function (layer) {
      const snapshot = document.createElement("canvas");
      snapshot.width = layer.canvas.width;
      snapshot.height = layer.canvas.height;
      const snapshotContext = snapshot.getContext("2d");
      snapshotContext.imageSmoothingEnabled = false;
      snapshotContext.drawImage(layer.canvas, 0, 0);
      layer.canvas.width = state.sheet.artWidth;
      layer.canvas.height = state.sheet.height;
      layer.canvas.style.width = state.sheet.artWidth + "px";
      layer.canvas.style.height = state.sheet.height + "px";
      layer.context = createCanvasContext(layer.canvas);
      layer.context.drawImage(snapshot, 0, 0);
    });
  }

  function drawLayerThumbnail(previewCanvas, layerCanvas) {
    const context = previewCanvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    const cellSize = 6;
    for (let y = 0; y < previewCanvas.height; y += cellSize) {
      for (let x = 0; x < previewCanvas.width; x += cellSize) {
        const even = ((x / cellSize) + (y / cellSize)) % 2 === 0;
        context.fillStyle = even ? "#f7f2e8" : "#ded8ca";
        context.fillRect(x, y, cellSize, cellSize);
      }
    }
    const scale = Math.min(previewCanvas.width / layerCanvas.width, previewCanvas.height / layerCanvas.height);
    const drawWidth = Math.max(1, Math.floor(layerCanvas.width * scale));
    const drawHeight = Math.max(1, Math.floor(layerCanvas.height * scale));
    const offsetX = Math.floor((previewCanvas.width - drawWidth) / 2);
    const offsetY = Math.floor((previewCanvas.height - drawHeight) / 2);
    context.drawImage(layerCanvas, offsetX, offsetY, drawWidth, drawHeight);
  }

  function createIconSvg(icon) {
    switch (icon) {
      case "arrow-left":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>';
      case "arrow-right":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>';
      case "focus":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H4v5"></path><path d="M15 4h5v5"></path><path d="M20 15v5h-5"></path><path d="M4 15v5h5"></path></svg>';
      case "plus":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>';
      case "info":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 10v6"></path><path d="M12 7.5h.01"></path></svg>';
      case "up":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"></path><path d="M7 10l5-5 5 5"></path></svg>';
      case "down":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"></path><path d="M17 14l-5 5-5-5"></path></svg>';
      case "eye":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"></path><circle cx="12" cy="12" r="2.8"></circle></svg>';
      case "eye-off":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"></path><path d="M10.6 6.2A11.7 11.7 0 0 1 12 6c6.4 0 10 6 10 6a17.7 17.7 0 0 1-4.1 4.7"></path><path d="M6.2 6.2A17.1 17.1 0 0 0 2 12s3.6 6 10 6c1.7 0 3.2-.3 4.5-.9"></path><path d="M14.1 14.1A3 3 0 0 1 9.9 9.9"></path></svg>';
            case "trash":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M7 7l1 13h8l1-13"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>';
      case "select":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h5"></path><path d="M14 5h5v5"></path><path d="M19 14v5h-5"></path><path d="M10 19H5v-5"></path><path d="M9 5H7a2 2 0 0 0-2 2v2"></path><path d="M19 9V7a2 2 0 0 0-2-2h-2"></path><path d="M15 19h2a2 2 0 0 0 2-2v-2"></path><path d="M5 15v2a2 2 0 0 0 2 2h2"></path></svg>';
      case "pen":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4.5-1 9.8-9.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20z"></path><path d="M13.8 7.2l3 3"></path></svg>';
      case "eraser":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.8 5.6 18.4 15.2"></path><path d="M6.4 8l5.6-5.6a2.2 2.2 0 0 1 3.1 0l6.5 6.5a2.2 2.2 0 0 1 0 3.1L16 17.6a3 3 0 0 1-2.1.9H8.2a3 3 0 0 1-2.1-.9L2.4 14a2.2 2.2 0 0 1 0-3.1L6.4 8z"></path><path d="M11 18.5h9"></path></svg>';
      case "picker":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4l6 6"></path><path d="M15.5 2.5a2.1 2.1 0 0 1 3 0l3 3a2.1 2.1 0 0 1 0 3l-7.7 7.7a3 3 0 0 1-1.4.8l-3.3.8.8-3.3a3 3 0 0 1 .8-1.4l7.8-7.6z"></path><path d="M8 16l-4 4"></path></svg>';
      case "upload":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V5"></path><path d="M7.5 9.5 12 5l4.5 4.5"></path><path d="M5 19h14"></path></svg>';
      case "download":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v11"></path><path d="M7.5 11.5 12 16l4.5-4.5"></path><path d="M5 19h14"></path></svg>';
      case "settings":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"></circle><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.4 1.4 0 0 1 0 2l-1.4 1.4a1.4 1.4 0 0 1-2 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.4 1.4 0 0 1-1.4 1.4h-2a1.4 1.4 0 0 1-1.4-1.4v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.4 1.4 0 0 1-2 0L3.3 18.2a1.4 1.4 0 0 1 0-2l.1-.1A1 1 0 0 0 3.6 15a1 1 0 0 0-.9-.6H2.5A1.4 1.4 0 0 1 1.1 13v-2a1.4 1.4 0 0 1 1.4-1.4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.4 1.4 0 0 1 0-2l1.4-1.4a1.4 1.4 0 0 1 2 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.4 1.4 0 0 1 1.4-1.4h2A1.4 1.4 0 0 1 14.5 4v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.4 1.4 0 0 1 2 0l1.4 1.4a1.4 1.4 0 0 1 0 2l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1.4 1.4 0 0 1 1.4 1.4v2a1.4 1.4 0 0 1-1.4 1.4h-.2a1 1 0 0 0-.9.6z"></path></svg>';
      default:
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6L6 18"></path></svg>';
    }
  }

  function createIconButton(icon, label, extraClass) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = extraClass ? "icon-button " + extraClass : "icon-button";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = createIconSvg(icon);
    return button;
  }

  function setButtonIcon(button, icon, label) {
    if (!button) {
      return;
    }
    button.innerHTML = createIconSvg(icon);
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  function setLabeledButtonIcon(button, icon, label) {
    if (!button) {
      return;
    }
    button.innerHTML = createIconSvg(icon) + '<span>' + label + '</span>';
    button.classList.add("button-with-icon");
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  function getToolIndicatorIcon(tool) {
    if (tool === "select") {
      return "select";
    }
    if (tool === "eraser") {
      return "eraser";
    }
    if (tool === "picker") {
      return "picker";
    }
    return "pen";
  }

  function renderToolReadout() {
    if (!elements.toolReadout) {
      return;
    }
    const label = getToolLabel(state.tool);
    elements.toolReadout.innerHTML = createIconSvg(getToolIndicatorIcon(state.tool));
    elements.toolReadout.classList.add("readout-pill-icon");
    elements.toolReadout.setAttribute("aria-label", label);
    elements.toolReadout.title = label;
  }

  function renderActiveLayerReadout() {
    if (!elements.activeLayerReadout) {
      return;
    }
    const label = document.createElement("span");
    label.textContent = getActiveLayer() ? getActiveLayer().name : "No layer";
    const swatch = document.createElement("span");
    swatch.className = "overlay-pill-swatch";
    swatch.style.background = state.activeColor;
    elements.activeLayerReadout.replaceChildren(label, swatch);
  }

  function cloneImageData(imageData) {
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  }

  function createPreviewCanvasFromImageData(imageData) {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    context.putImageData(cloneImageData(imageData), 0, 0);
    return canvas;
  }

  function updatePasteButton() {
    if (!elements.pasteSelectionBtn) {
      return;
    }
    elements.pasteSelectionBtn.disabled = !state.clipboardSelection;
  }

  function clearSelectionPointerState() {
    state.pointer.selectionStart = null;
    state.pointer.selectionCurrent = null;
    state.pointer.selectionMoveOffsetX = 0;
    state.pointer.selectionMoveOffsetY = 0;
    state.pointer.selectionMoveOriginX = 0;
    state.pointer.selectionMoveOriginY = 0;
  }

  function hideSelectionActionCard() {
    if (!elements.selectionActionCard) {
      return;
    }
    elements.selectionActionCard.classList.add("is-hidden");
    elements.selectionActionCard.setAttribute("aria-hidden", "true");
  }

  function showSelectionActionCard(clientX, clientY) {
    if (!elements.selectionActionCard || !state.selection || state.selection.isFloating) {
      return;
    }
    elements.selectionActionCard.classList.remove("is-hidden");
    elements.selectionActionCard.setAttribute("aria-hidden", "false");
    const viewportRect = elements.viewport.getBoundingClientRect();
    const cardRect = elements.selectionActionCard.getBoundingClientRect();
    const margin = 10;
    const maxLeft = Math.max(margin, Math.round(viewportRect.width - cardRect.width - margin));
    const maxTop = Math.max(margin, Math.round(viewportRect.height - cardRect.height - margin));
    const left = clamp(Math.round(clientX - viewportRect.left + 14), margin, maxLeft);
    const top = clamp(Math.round(clientY - viewportRect.top + 14), margin, maxTop);
    elements.selectionActionCard.style.left = left + "px";
    elements.selectionActionCard.style.top = top + "px";
  }

  function normalizeSelectionBounds(startPoint, endPoint) {
    const left = Math.min(startPoint.x, endPoint.x);
    const top = Math.min(startPoint.y, endPoint.y);
    const right = Math.max(startPoint.x, endPoint.x);
    const bottom = Math.max(startPoint.y, endPoint.y);
    return {
      x: left,
      y: top,
      width: right - left + 1,
      height: bottom - top + 1,
    };
  }

  function refreshSelectionImageData() {
    if (!state.selection) {
      return null;
    }
    const layer = getLayerById(state.selection.layerId);
    if (!layer) {
      clearSelection({ preserveClipboard: true });
      return null;
    }
    state.selection.imageData = cloneImageData(layer.context.getImageData(state.selection.x, state.selection.y, state.selection.width, state.selection.height));
    state.selection.previewCanvas = createPreviewCanvasFromImageData(state.selection.imageData);
    return state.selection.imageData;
  }

  function setSelectionFromBounds(layerId, bounds) {
    const layer = getLayerById(layerId);
    if (!layer || !bounds || bounds.width < 1 || bounds.height < 1) {
      clearSelection({ preserveClipboard: true });
      return null;
    }
    const selection = {
      layerId: layerId,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isFloating: false,
      imageData: cloneImageData(layer.context.getImageData(bounds.x, bounds.y, bounds.width, bounds.height)),
    };
    selection.previewCanvas = createPreviewCanvasFromImageData(selection.imageData);
    state.selection = selection;
    drawOverlay();
    return selection;
  }

  function clearSelection(options) {
    const preserveClipboard = Boolean(options && options.preserveClipboard);
    const selection = state.selection;
    if (selection && selection.isFloating) {
      const layer = getLayerById(selection.layerId);
      if (layer) {
        layer.context.putImageData(selection.imageData, selection.x, selection.y);
      }
    }
    state.selection = null;
    if (!preserveClipboard) {
      state.clipboardSelection = null;
    }
    hideSelectionActionCard();
    clearSelectionPointerState();
    updatePasteButton();
    drawOverlay();
  }

  function copySelectionToClipboard() {
    if (!state.selection) {
      return false;
    }
    const imageData = refreshSelectionImageData();
    if (!imageData) {
      return false;
    }
    state.clipboardSelection = {
      width: state.selection.width,
      height: state.selection.height,
      x: state.selection.x,
      y: state.selection.y,
      imageData: cloneImageData(imageData),
    };
    updatePasteButton();
    hideSelectionActionCard();
    return true;
  }

  function cutSelectionToClipboard() {
    if (!state.selection || !copySelectionToClipboard()) {
      return;
    }
    const layer = getLayerById(state.selection.layerId);
    if (!layer) {
      clearSelection({ preserveClipboard: true });
      return;
    }
    layer.context.clearRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
    renderLayerList();
    renderStats();
    clearSelection({ preserveClipboard: true });
    commitHistory();
  }

  function deleteSelectedPixels() {
    if (!state.selection) {
      return;
    }
    const layer = getLayerById(state.selection.layerId);
    if (!layer) {
      clearSelection({ preserveClipboard: true });
      return;
    }
    layer.context.clearRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
    renderLayerList();
    renderStats();
    clearSelection({ preserveClipboard: true });
    commitHistory();
  }

  function pasteClipboardSelection() {
    if (!state.clipboardSelection) {
      return;
    }
    if (state.clipboardSelection.width > state.sheet.artWidth || state.clipboardSelection.height > state.sheet.height) {
      window.alert("That copied selection does not fit in the current hat size.");
      return;
    }
    hideSelectionActionCard();
    const pasteX = clamp(state.clipboardSelection.x, 0, Math.max(0, state.sheet.artWidth - state.clipboardSelection.width));
    const pasteY = clamp(state.clipboardSelection.y, 0, Math.max(0, state.sheet.height - state.clipboardSelection.height));
    const layer = addLayer({ name: "Pasted Selection", skipHistory: true });
    layer.context.putImageData(cloneImageData(state.clipboardSelection.imageData), pasteX, pasteY);
    syncLayerStack();
    renderLayerList();
    renderStats();
    setTool("select");
    setSelectionFromBounds(layer.id, {
      x: pasteX,
      y: pasteY,
      width: state.clipboardSelection.width,
      height: state.clipboardSelection.height,
    });
    commitHistory();
  }

  function pointIntersectsSelection(point) {
    if (!state.selection || !point) {
      return false;
    }
    return point.x >= state.selection.x && point.x < state.selection.x + state.selection.width && point.y >= state.selection.y && point.y < state.selection.y + state.selection.height;
  }

  function beginSelectionDraft(point) {
    state.pointer.selectionStart = point;
    state.pointer.selectionCurrent = point;
    hideSelectionActionCard();
    drawOverlay();
  }

  function updateSelectionDraft(point) {
    if (!state.pointer.selectionStart || !point) {
      return;
    }
    state.pointer.selectionCurrent = point;
    drawOverlay();
  }

  function finishSelectionDraft(clientX, clientY) {
    if (!state.pointer.selectionStart || !state.pointer.selectionCurrent) {
      clearSelectionPointerState();
      return;
    }
    const layer = getActiveLayer();
    const bounds = normalizeSelectionBounds(state.pointer.selectionStart, state.pointer.selectionCurrent);
    clearSelectionPointerState();
    if (!layer) {
      clearSelection({ preserveClipboard: true });
      return;
    }
    setSelectionFromBounds(layer.id, bounds);
    showSelectionActionCard(clientX, clientY);
  }

  function beginSelectionMove(point) {
    if (!state.selection || !point) {
      return;
    }
    const layer = getLayerById(state.selection.layerId);
    if (!layer) {
      clearSelection({ preserveClipboard: true });
      return;
    }
    refreshSelectionImageData();
    state.pointer.selectionMoveOffsetX = point.x - state.selection.x;
    state.pointer.selectionMoveOffsetY = point.y - state.selection.y;
    state.pointer.selectionMoveOriginX = state.selection.x;
    state.pointer.selectionMoveOriginY = state.selection.y;
    state.selection.isFloating = true;
    layer.context.clearRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height);
    hideSelectionActionCard();
    drawOverlay();
  }

  function updateFloatingSelection(point) {
    if (!state.selection || !state.selection.isFloating || !point) {
      return;
    }
    state.selection.x = clamp(point.x - state.pointer.selectionMoveOffsetX, 0, Math.max(0, state.sheet.artWidth - state.selection.width));
    state.selection.y = clamp(point.y - state.pointer.selectionMoveOffsetY, 0, Math.max(0, state.sheet.height - state.selection.height));
    drawOverlay();
  }

  function finishSelectionMove() {
    if (!state.selection || !state.selection.isFloating) {
      return;
    }
    const layer = getLayerById(state.selection.layerId);
    if (!layer) {
      clearSelection({ preserveClipboard: true });
      return;
    }
    layer.context.putImageData(cloneImageData(state.selection.imageData), state.selection.x, state.selection.y);
    state.selection.isFloating = false;
    renderLayerList();
    renderStats();
    drawOverlay();
    if (state.selection.x !== state.pointer.selectionMoveOriginX || state.selection.y !== state.pointer.selectionMoveOriginY) {
      commitHistory();
    }
  }

  function drawSelectionBounds(bounds, fillAlpha) {
    const left = artBoundaryToScreenX(bounds.x);
    const top = artBoundaryToScreenY(bounds.y);
    const right = artBoundaryToScreenX(bounds.x + bounds.width);
    const bottom = artBoundaryToScreenY(bounds.y + bounds.height);
    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);
    const accent = state.themeAccent || DEFAULT_THEME_ACCENT;
    const dashSize = Math.max(4, Math.round(state.zoom * 0.7));

    overlayContext.save();
    overlayContext.fillStyle = hexToRgba(accent, fillAlpha);
    overlayContext.fillRect(left + 1, top + 1, Math.max(0, width - 2), Math.max(0, height - 2));
    overlayContext.setLineDash([dashSize, dashSize]);
    overlayContext.lineWidth = 1;
    overlayContext.strokeStyle = "rgba(255, 255, 255, 0.92)";
    overlayContext.strokeRect(left, top, width, height);
    overlayContext.lineDashOffset = dashSize;
    overlayContext.strokeStyle = hexToRgba(accent, 0.96);
    overlayContext.strokeRect(left, top, width, height);
    overlayContext.restore();
  }

  function drawSelectionOverlay() {
    if (state.selection && state.selection.isFloating && state.selection.previewCanvas) {
      overlayContext.save();
      overlayContext.globalAlpha = 0.94;
      overlayContext.imageSmoothingEnabled = false;
      overlayContext.drawImage(
        state.selection.previewCanvas,
        artToScreenX(state.selection.x),
        artToScreenY(state.selection.y),
        Math.max(1, Math.round(state.selection.width * state.zoom)),
        Math.max(1, Math.round(state.selection.height * state.zoom))
      );
      overlayContext.restore();
    }

    if (state.selection) {
      drawSelectionBounds(state.selection, state.selection.isFloating ? 0.08 : 0.06);
    }

    if (state.pointer.selectionStart && state.pointer.selectionCurrent) {
      drawSelectionBounds(normalizeSelectionBounds(state.pointer.selectionStart, state.pointer.selectionCurrent), 0.1);
    }
  }

  function positionAccentThemeInput() {
    if (!elements.accentThemeBtn || !elements.accentThemeInput) {
      return;
    }
    const buttonRect = elements.accentThemeBtn.getBoundingClientRect();
    elements.accentThemeInput.style.left = Math.round(buttonRect.left) + "px";
    elements.accentThemeInput.style.top = Math.round(buttonRect.bottom + 8) + "px";
    elements.accentThemeInput.style.width = Math.max(1, Math.round(buttonRect.width)) + "px";
    elements.accentThemeInput.style.height = "1px";
  }

  function initializeStaticUi() {
    setButtonIcon(elements.undoBtn, "arrow-left", "Undo");
    setButtonIcon(elements.redoBtn, "arrow-right", "Redo");
    setButtonIcon(elements.fitViewBtn, "focus", "Fit View");
    setLabeledButtonIcon(elements.importHatBtn, "upload", "Import Hat");
    setLabeledButtonIcon(elements.downloadBtn, "download", "Download Hat");
    setButtonIcon(elements.accentThemeBtn, "settings", "Accent Color");
    setButtonIcon(elements.addLayerBtn, "plus", "Add Layer");
    setButtonIcon(elements.infoTabBtn, "info", "Info");
    renderToolReadout();
  }

  function renderLayerList() {
    const fragment = document.createDocumentFragment();
    const reversed = state.layers.map(function (layer, index) {
      return { layer, index };
    }).reverse();

    reversed.forEach(function (entry) {
      const layer = entry.layer;
      const index = entry.index;
      const card = document.createElement("article");
      card.className = "layer-card" + (layer.id === state.activeLayerId ? " is-active" : "");
      card.tabIndex = 0;
      card.addEventListener("click", function () {
        if (state.activeLayerId === layer.id) {
          return;
        }
        if (state.selection && state.selection.layerId !== layer.id) {
          clearSelection({ preserveClipboard: true });
        }
        state.activeLayerId = layer.id;
        renderLayerList();
        renderStats();
      });
      card.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        if (state.activeLayerId === layer.id) {
          return;
        }
        if (state.selection && state.selection.layerId !== layer.id) {
          clearSelection({ preserveClipboard: true });
        }
        state.activeLayerId = layer.id;
        renderLayerList();
        renderStats();
      });

      const top = document.createElement("div");
      top.className = "layer-card-top";

      const thumbWrap = document.createElement("div");
      thumbWrap.className = "layer-thumbnail";
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = 56;
      thumbCanvas.height = 56;
      drawLayerThumbnail(thumbCanvas, layer.canvas);
      thumbWrap.appendChild(thumbCanvas);

      const info = document.createElement("div");
      info.className = "layer-info";

      const titleRow = document.createElement("div");
      titleRow.className = "layer-title-row";
      const title = document.createElement("h3");
      title.className = "layer-name";
      title.textContent = layer.name;
      title.addEventListener("dblclick", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (titleRow.querySelector(".layer-name-input")) {
          return;
        }
        const input = document.createElement("input");
        input.type = "text";
        input.className = "layer-name-input";
        input.value = layer.name;
        const originalName = layer.name;
        let finished = false;

        function finishRename(shouldCommit) {
          if (finished) {
            return;
          }
          finished = true;
          const nextName = String(input.value || "").trim() || originalName;
          title.textContent = shouldCommit ? nextName : originalName;
          titleRow.replaceChild(title, input);
          if (shouldCommit && nextName !== originalName) {
            layer.name = nextName;
            renderStats();
            commitHistory();
          }
        }

        input.addEventListener("pointerdown", function (pointerEvent) {
          pointerEvent.stopPropagation();
        });
        input.addEventListener("click", function (clickEvent) {
          clickEvent.stopPropagation();
        });
        input.addEventListener("keydown", function (keyEvent) {
          if (keyEvent.key === "Enter") {
            keyEvent.preventDefault();
            finishRename(true);
            return;
          }
          if (keyEvent.key === "Escape") {
            keyEvent.preventDefault();
            finishRename(false);
          }
        });
        input.addEventListener("blur", function () {
          finishRename(true);
        });

        titleRow.replaceChild(input, title);
        input.focus();
        input.select();
      });
      const stateChip = document.createElement("span");
      stateChip.className = "layer-chip";
      stateChip.textContent = layer.id === state.activeLayerId ? "Active" : layer.visible ? "Layer" : "Hidden";
      titleRow.appendChild(title);
      titleRow.appendChild(stateChip);

      const actions = document.createElement("div");
      actions.className = "layer-actions";

      const visibilityButton = createIconButton(layer.visible ? "eye" : "eye-off", layer.visible ? "Hide layer" : "Show layer");
      visibilityButton.addEventListener("click", function (event) {
        event.stopPropagation();
        layer.visible = !layer.visible;
        syncLayerStack();
        renderLayerList();
        renderStats();
        commitHistory();
      });

      const raiseButton = createIconButton("up", "Raise layer");
      raiseButton.disabled = index === state.layers.length - 1;
      raiseButton.addEventListener("click", function (event) {
        event.stopPropagation();
        moveLayer(layer.id, 1);
      });

      const lowerButton = createIconButton("down", "Lower layer");
      lowerButton.disabled = index === 0;
      lowerButton.addEventListener("click", function (event) {
        event.stopPropagation();
        moveLayer(layer.id, -1);
      });

      const deleteButton = createIconButton("trash", "Delete layer");
      deleteButton.disabled = state.layers.length === 1;
      deleteButton.addEventListener("click", function (event) {
        event.stopPropagation();
        deleteLayer(layer.id);
      });

      actions.appendChild(visibilityButton);
      actions.appendChild(raiseButton);
      actions.appendChild(lowerButton);
      actions.appendChild(deleteButton);

      info.appendChild(titleRow);
      info.appendChild(actions);
      top.appendChild(thumbWrap);
      top.appendChild(info);

      const controls = document.createElement("div");
      controls.className = "layer-controls-grid";

      const opacitySetting = document.createElement("div");
      opacitySetting.className = "layer-setting";
      const opacityRow = document.createElement("div");
      opacityRow.className = "layer-setting-row";
      const opacityLabel = document.createElement("label");
      opacityLabel.textContent = "Opacity";
      const opacityRange = document.createElement("input");
      opacityRange.type = "range";
      opacityRange.min = "0";
      opacityRange.max = "1";
      opacityRange.step = "0.05";
      opacityRange.value = String(layer.opacity);
      const opacityValue = document.createElement("span");
      opacityValue.className = "value-chip";
      opacityValue.textContent = Math.round(layer.opacity * 100) + "%";
      opacityRange.addEventListener("input", function () {
        layer.opacity = Number(opacityRange.value);
        opacityValue.textContent = Math.round(layer.opacity * 100) + "%";
        syncLayerStack();
      });
      opacityRange.addEventListener("change", function () {
        layer.opacity = Number(opacityRange.value);
        opacityValue.textContent = Math.round(layer.opacity * 100) + "%";
        syncLayerStack();
        commitHistory();
      });
      opacityRow.appendChild(opacityLabel);
      opacityRow.appendChild(opacityRange);
      opacityRow.appendChild(opacityValue);
      opacitySetting.appendChild(opacityRow);

      controls.appendChild(opacitySetting);
      card.appendChild(top);
      card.appendChild(controls);
      fragment.appendChild(card);
    });

    elements.layerList.replaceChildren(fragment);
  }

  function addLayer(options) {
    const layerName = options && options.name ? options.name : "Layer " + (state.layerCounter + 1);
    const layer = createLayer(layerName, options && options.id, options && options.width, options && options.height);
    state.layers.push(layer);
    clearSelection({ preserveClipboard: true });
    state.activeLayerId = layer.id;
    syncLayerStack();
    renderLayerList();
    renderStats();
    if (!(options && options.skipHistory)) {
      commitHistory();
    }
    return layer;
  }

  function moveLayer(layerId, offset) {
    const currentIndex = state.layers.findIndex(function (layer) {
      return layer.id === layerId;
    });
    if (currentIndex === -1) {
      return;
    }
    const nextIndex = clamp(currentIndex + offset, 0, state.layers.length - 1);
    if (nextIndex === currentIndex) {
      return;
    }
    const layer = state.layers.splice(currentIndex, 1)[0];
    state.layers.splice(nextIndex, 0, layer);
    syncLayerStack();
    renderLayerList();
    commitHistory();
  }

  function deleteLayer(layerId) {
    if (state.layers.length === 1) {
      return;
    }
    const currentIndex = state.layers.findIndex(function (layer) {
      return layer.id === layerId;
    });
    if (currentIndex === -1) {
      return;
    }
    if (state.selection && state.selection.layerId === layerId) {
      clearSelection({ preserveClipboard: true });
    }
    const removed = state.layers.splice(currentIndex, 1)[0];
    if (removed && removed.canvas.parentNode === elements.layerStack) {
      elements.layerStack.removeChild(removed.canvas);
    }
    if (state.activeLayerId === layerId) {
      const fallback = state.layers[Math.max(0, currentIndex - 1)] || state.layers[0];
      state.activeLayerId = fallback ? fallback.id : null;
    }
    syncLayerStack();
    renderLayerList();
    renderStats();
    commitHistory();
  }

  function renderPalette() {
    const fragment = document.createDocumentFragment();
    state.palette.forEach(function (color) {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "palette-swatch" + (color === state.activeColor ? " is-active" : "");
      swatch.style.background = color;
      swatch.title = color;
      swatch.addEventListener("click", function () {
        setActiveColor(color);
      });
      fragment.appendChild(swatch);
    });
    elements.paletteGrid.replaceChildren(fragment);
  }

  function setActiveColor(color) {
    state.activeColor = String(color).toLowerCase();
    elements.colorInput.value = state.activeColor;
    elements.colorValue.textContent = toUpperHex(state.activeColor);
    renderPalette();
    renderActiveLayerReadout();
  }

  function saveCurrentColor() {
    const color = state.activeColor.toLowerCase();
    const existingIndex = state.palette.indexOf(color);
    if (existingIndex !== -1) {
      state.palette.splice(existingIndex, 1);
    }
    state.palette.unshift(color);
    state.palette = state.palette.slice(0, 18);
    persistPalette();
    renderPalette();
  }

  function setTool(nextTool) {
    state.tool = nextTool;
    if (nextTool !== "select") {
      hideSelectionActionCard();
    }
    if (nextTool === "pen" || nextTool === "eraser") {
      state.lastDrawTool = nextTool;
    }
    renderToolState();
  }

  function toggleDrawTool() {
    const nextTool = state.lastDrawTool === "pen" ? "eraser" : "pen";
    setTool(nextTool);
  }

  function renderToolState() {
    Array.from(elements.toolButtons.querySelectorAll("[data-tool]")).forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.tool === state.tool);
    });
    renderToolReadout();
    updateViewportCursor();
  }

  function measureDrawerAnchor(button) {
    if (!button || !elements.editorShell) {
      return null;
    }
    const shellRect = elements.editorShell.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      left: buttonRect.left - shellRect.left,
      bottom: buttonRect.bottom - shellRect.top,
      width: buttonRect.width,
    };
  }

  function closeDrawer() {
    if (!state.activeTab) {
      return;
    }
    state.activeTab = null;
    state.drawerAnchor = null;
    renderTrayState();
  }

  function getDrawerWidth(drawerId) {
    switch (drawerId) {
      case "setup":
        return 260;
      case "tools":
        return 344;
      case "scene":
        return 320;
      case "overlays":
        return 220;
      case "info":
        return 340;
      default:
        return 260;
    }
  }

  function setActiveTab(nextTab, anchorButton) {
    if (nextTab === "metapixels") {
      openMetapixelModal();
      return;
    }
    if (state.activeTab === nextTab) {
      closeDrawer();
      return;
    }
    state.activeTab = nextTab;
    state.drawerAnchor = measureDrawerAnchor(anchorButton);
    renderTrayState();
  }

  function renderTrayState() {
    const hasActiveTab = Boolean(state.activeTab);
    elements.controlTray.classList.toggle("is-hidden", !hasActiveTab);
    elements.controlTray.setAttribute("aria-hidden", hasActiveTab ? "false" : "true");
    elements.controlTray.dataset.drawer = state.activeTab || "";
    Array.from(elements.tabStrip.querySelectorAll("[data-tab]")).forEach(function (button) {
      const isNormalTab = button.dataset.tab !== "metapixels";
      button.classList.toggle("is-active", isNormalTab && button.dataset.tab === state.activeTab);
    });
    Array.from(elements.controlTray.querySelectorAll("[data-tray]")).forEach(function (panel) {
      panel.classList.toggle("is-active", panel.dataset.tray === state.activeTab);
    });
    if (!hasActiveTab) {
      elements.controlTray.style.removeProperty("width");
      elements.controlTray.style.removeProperty("left");
      elements.controlTray.style.removeProperty("top");
      return;
    }
    const activeButton = elements.tabStrip.querySelector('[data-tab="' + state.activeTab + '"]');
    const anchor = measureDrawerAnchor(activeButton) || state.drawerAnchor;
    if (!anchor) {
      return;
    }
    state.drawerAnchor = anchor;
    if (!elements.editorShell) {
      return;
    }
    const shellRect = elements.editorShell.getBoundingClientRect();
    const drawerWidth = Math.min(getDrawerWidth(state.activeTab), Math.max(220, Math.floor(shellRect.width - 8)));
    const maxLeft = Math.max(0, Math.floor(shellRect.width - drawerWidth - 8));
    const centeredLeft = anchor.left + anchor.width / 2 - drawerWidth / 2;
    const left = clamp(Math.round(centeredLeft), 0, maxLeft);
    const top = Math.round(anchor.bottom + 8);
    elements.controlTray.style.width = drawerWidth + "px";
    elements.controlTray.style.left = left + "px";
    elements.controlTray.style.top = top + "px";
  }


  function applyStageBackground() {
    state.background = normalizeBackgroundState(state.background);
    const texture = TEXTURE_PRESETS[state.background.texture] || TEXTURE_PRESETS.checker;
    const images = [];
    const sizes = [];
    const repeats = [];
    const positions = [];
    if (state.background.imageDataUrl) {
      images.push('url("' + state.background.imageDataUrl + '")');
      sizes.push("cover");
      repeats.push("no-repeat");
      positions.push("center");
    }
    if (texture.image !== "none") {
      images.push(texture.image);
      sizes.push(texture.size);
      repeats.push(texture.repeat);
      positions.push(texture.position);
    }
    elements.stageSurface.style.backgroundColor = state.background.color;
    elements.stageSurface.style.backgroundImage = images.length ? images.join(",") : "none";
    elements.stageSurface.style.backgroundSize = sizes.length ? sizes.join(",") : "auto";
    elements.stageSurface.style.backgroundRepeat = repeats.length ? repeats.join(",") : "no-repeat";
    elements.stageSurface.style.backgroundPosition = positions.length ? positions.join(",") : "center";
  }

  function renderStats() {
    elements.layoutSelect.value = state.layoutMode;
    elements.rockToggle.checked = state.includeRock;
    elements.particlesToggle.checked = state.includeParticles;
    elements.gridToggle.checked = state.showGrid;
    elements.guidesToggle.checked = state.showGuides;
    elements.duckReferenceToggle.checked = state.duckReferenceAssets.hasAny && state.showDuckReference;
    elements.duckReferenceToggle.disabled = !state.duckReferenceAssets.hasAny;
    if (elements.setupArtSizeLabel) {
      elements.setupArtSizeLabel.textContent = state.sheet.artWidth + " x " + state.sheet.height;
    }
    if (elements.setupExportSizeLabel) {
      elements.setupExportSizeLabel.textContent = state.sheet.exportWidth + " x " + state.sheet.height;
    }
    renderToolReadout();
    updatePasteButton();
    elements.zoomReadout.textContent = formatNumber(state.zoom, 1) + "x";
    elements.backgroundTextureSelect.value = state.background.texture;
    elements.backgroundColorInput.value = state.background.color;
    elements.backgroundColorValue.textContent = toUpperHex(state.background.color);
    elements.backgroundImageName.textContent = state.background.imageName || "No image.";
    renderActiveLayerReadout();
    elements.historyReadout.textContent = "U" + Math.max(state.history.undo.length - 1, 0) + " R" + state.history.redo.length;
    elements.undoBtn.disabled = state.history.undo.length <= 1;
    elements.redoBtn.disabled = state.history.redo.length === 0;
  }

  function renderMetaPreviewBar() {
    if (!state.sheet.activeMetapixels.length) {
      const empty = document.createElement("div");
      empty.className = "meta-preview-empty";
      empty.textContent = "No metapixels";
      elements.metaPreview.replaceChildren(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    state.sheet.activeMetapixels.slice(0, 4).forEach(function (pixel) {
      const chip = document.createElement("div");
      chip.className = "meta-preview-chip";
      const swatch = document.createElement("span");
      swatch.className = "meta-preview-swatch";
      swatch.style.background = "rgb(" + pixel.r + ", " + pixel.g + ", " + pixel.b + ")";
      const label = document.createElement("span");
      label.textContent = pixel.name;
      chip.appendChild(swatch);
      chip.appendChild(label);
      fragment.appendChild(chip);
    });
    if (state.sheet.activeMetapixels.length > 4) {
      const more = document.createElement("div");
      more.className = "meta-preview-chip";
      more.textContent = "+" + (state.sheet.activeMetapixels.length - 4);
      fragment.appendChild(more);
    }
    elements.metaPreview.replaceChildren(fragment);
  }

  function renderDuckReference() {
    if (!state.duckReferenceAssets.hasAny) {
      state.showDuckReference = false;
    }
    referenceContext.clearRect(0, 0, elements.referenceCanvas.width, elements.referenceCanvas.height);
    if (!state.showDuckReference || !state.duckReferenceAssets.hasAny) {
      return;
    }
    if (state.duckReferenceAssets.idle) {
      referenceContext.drawImage(state.duckReferenceAssets.idle, 0, 0, FRAME_SIZE, FRAME_SIZE);
    }
    if (state.layoutMode !== "basic" && state.sheet.artWidth >= FRAME_SIZE * 2 && state.duckReferenceAssets.quack) {
      referenceContext.drawImage(state.duckReferenceAssets.quack, FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE);
    }
  }

  function renderParticlePrompt() {
    const particleMetapixels = state.sheet.activeMetapixels.filter(function (pixel) {
      return pixel.category === "Particle";
    });
    const shouldShow = state.includeParticles && particleMetapixels.length === 0;
    elements.particlePrompt.classList.toggle("is-hidden", !shouldShow);
  }

  function syncStageDimensions() {
    elements.stage.style.width = state.sheet.exportWidth + "px";
    elements.stage.style.height = state.sheet.height + "px";
    elements.stageSurface.style.width = state.sheet.exportWidth + "px";
    elements.stageSurface.style.height = state.sheet.height + "px";
    elements.referenceCanvas.width = state.sheet.artWidth;
    elements.referenceCanvas.height = state.sheet.height;
    elements.referenceCanvas.style.width = state.sheet.artWidth + "px";
    elements.referenceCanvas.style.height = state.sheet.height + "px";
    elements.guideCanvas.width = state.sheet.artWidth;
    elements.guideCanvas.height = state.sheet.height;
    elements.guideCanvas.style.width = state.sheet.artWidth + "px";
    elements.guideCanvas.style.height = state.sheet.height + "px";
  }

  function syncOverlayCanvasToViewport() {
    const width = Math.max(1, Math.round(elements.viewport.clientWidth));
    const height = Math.max(1, Math.round(elements.viewport.clientHeight));
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));

    if (elements.overlayCanvas.width !== pixelWidth || elements.overlayCanvas.height !== pixelHeight) {
      elements.overlayCanvas.width = pixelWidth;
      elements.overlayCanvas.height = pixelHeight;
    }
    elements.overlayCanvas.style.width = width + "px";
    elements.overlayCanvas.style.height = height + "px";

    overlayContext.setTransform(1, 0, 0, 1, 0, 0);
    overlayContext.clearRect(0, 0, elements.overlayCanvas.width, elements.overlayCanvas.height);
    overlayContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    overlayContext.imageSmoothingEnabled = false;

    return { width: width, height: height };
  }

  function artToScreenX(value) {
    return Math.round(state.panX + value * state.zoom);
  }

  function artToScreenY(value) {
    return Math.round(state.panY + value * state.zoom);
  }

  function artBoundaryToScreenX(value) {
    return Math.round(state.panX + value * state.zoom) + 0.5;
  }

  function artBoundaryToScreenY(value) {
    return Math.round(state.panY + value * state.zoom) + 0.5;
  }

  function clearGuideLayer() {
    guideContext.clearRect(0, 0, elements.guideCanvas.width, elements.guideCanvas.height);
  }

  function drawGuideRect(x, y, width, height, color) {
    guideContext.strokeStyle = color;
    guideContext.lineWidth = 1;
    guideContext.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }

  function renderGuideLayer() {
    clearGuideLayer();
    if (!state.showGuides) {
      return;
    }

    drawGuideRect(0, 0, FRAME_SIZE, FRAME_SIZE, GUIDE_COLORS.Idle);

    if (state.layoutMode !== "basic") {
      drawGuideRect(FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE, GUIDE_COLORS.Quack);
    }

    if (state.layoutMode === "cape") {
      drawGuideRect(FRAME_SIZE * 2, 0, FRAME_SIZE, FRAME_SIZE, GUIDE_COLORS.Cape);
    }

    if (state.includeRock || state.includeParticles) {
      drawGuideRect(0, FRAME_SIZE, ROCK_SIZE, ROCK_SIZE, GUIDE_COLORS.Rock);
    }

    if (state.includeParticles) {
      const particleFrames = [
        { x: ROCK_SIZE, y: FRAME_SIZE, width: 12, height: 12 },
        { x: ROCK_SIZE + 12, y: FRAME_SIZE, width: 12, height: 12 },
        { x: ROCK_SIZE, y: FRAME_SIZE + 12, width: 12, height: 12 },
        { x: ROCK_SIZE + 12, y: FRAME_SIZE + 12, width: 12, height: 12 },
      ];
      particleFrames.forEach(function (frame) {
        drawGuideRect(frame.x, frame.y, frame.width, frame.height, GUIDE_COLORS.Particles);
      });
    }
  }

  function getFrameLabelEntries() {
    const frames = [
      { label: "Idle", x: 0, y: 0, width: FRAME_SIZE, height: FRAME_SIZE, color: GUIDE_COLORS.Idle },
    ];

    if (state.layoutMode !== "basic") {
      frames.push({ label: "Quack", x: FRAME_SIZE, y: 0, width: FRAME_SIZE, height: FRAME_SIZE, color: GUIDE_COLORS.Quack });
    }

    if (state.layoutMode === "cape") {
      frames.push({ label: "Cape", x: FRAME_SIZE * 2, y: 0, width: FRAME_SIZE, height: FRAME_SIZE, color: GUIDE_COLORS.Cape });
    }

    if (state.includeRock || state.includeParticles) {
      frames.push({ label: "Rock", x: 0, y: FRAME_SIZE, width: ROCK_SIZE, height: ROCK_SIZE, color: GUIDE_COLORS.Rock });
    }

    if (state.includeParticles) {
      [
        { label: "P1", x: ROCK_SIZE, y: FRAME_SIZE, width: 12, height: 12 },
        { label: "P2", x: ROCK_SIZE + 12, y: FRAME_SIZE, width: 12, height: 12 },
        { label: "P3", x: ROCK_SIZE, y: FRAME_SIZE + 12, width: 12, height: 12 },
        { label: "P4", x: ROCK_SIZE + 12, y: FRAME_SIZE + 12, width: 12, height: 12 },
      ].forEach(function (frame) {
        frames.push({
          label: frame.label,
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
          color: GUIDE_COLORS.Particles,
        });
      });
    }

    return frames;
  }

  function drawRoundedRectPath(context, x, y, width, height, radius) {
    const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.arcTo(x + width, y, x + width, y + height, safeRadius);
    context.arcTo(x + width, y + height, x, y + height, safeRadius);
    context.arcTo(x, y + height, x, y, safeRadius);
    context.arcTo(x, y, x + width, y, safeRadius);
    context.closePath();
  }

  function drawFrameLabelsOverlay() {
    const remaining = frameLabelsVisibleUntil - Date.now();
    if (remaining <= 0) {
      return;
    }

    const alpha = remaining > FRAME_LABEL_FADE_DURATION ? 1 : clamp(remaining / FRAME_LABEL_FADE_DURATION, 0, 1);
    getFrameLabelEntries().forEach(function (frame) {
      const left = artToScreenX(frame.x);
      const top = artToScreenY(frame.y);
      const right = artToScreenX(frame.x + frame.width);
      const bottom = artToScreenY(frame.y + frame.height);
      const frameWidth = Math.max(1, right - left);
      const frameHeight = Math.max(1, bottom - top);
      const fontSize = clamp(Math.round(Math.min(frameHeight * 0.22, frame.width <= 12 ? frameWidth * 0.24 : frameWidth * 0.16)), 10, 14);

      overlayContext.save();
      overlayContext.globalAlpha = alpha;
      overlayContext.font = "700 " + fontSize + "px Bahnschrift, \"Trebuchet MS\", sans-serif";
      overlayContext.textAlign = "center";
      overlayContext.textBaseline = "middle";

      const textWidth = overlayContext.measureText(frame.label).width;
      const pillWidth = Math.ceil(textWidth + (frame.label.length <= 2 ? 16 : 22));
      const pillHeight = Math.max(24, Math.round(fontSize + 12));
      const pillX = Math.round(left + (frameWidth - pillWidth) / 2);
      const pillY = Math.round(top + Math.min(16, Math.max(6, frameHeight * 0.12)));

      overlayContext.shadowColor = "rgba(8, 17, 27, 0.16)";
      overlayContext.shadowBlur = 10;
      overlayContext.fillStyle = "rgba(255, 250, 240, 0.96)";
      drawRoundedRectPath(overlayContext, pillX, pillY, pillWidth, pillHeight, Math.round(pillHeight / 2));
      overlayContext.fill();
      overlayContext.shadowColor = "transparent";
      overlayContext.lineWidth = 1;
      overlayContext.strokeStyle = hexToRgba(frame.color, 0.55);
      overlayContext.stroke();
      overlayContext.fillStyle = "rgba(17, 24, 39, 0.92)";
      overlayContext.fillText(frame.label, pillX + pillWidth / 2, pillY + pillHeight / 2 + 0.5);
      overlayContext.restore();
    });
  }

  function showFrameLabelsTemporarily() {
    frameLabelsVisibleUntil = Date.now() + FRAME_LABEL_DURATION;
    if (frameLabelAnimationFrame) {
      drawOverlay();
      return;
    }

    function stepFrameLabelOverlay() {
      frameLabelAnimationFrame = 0;
      drawOverlay();
      if (frameLabelsVisibleUntil > Date.now()) {
        frameLabelAnimationFrame = window.requestAnimationFrame(stepFrameLabelOverlay);
        return;
      }
      frameLabelsVisibleUntil = 0;
      drawOverlay();
    }

    frameLabelAnimationFrame = window.requestAnimationFrame(stepFrameLabelOverlay);
    drawOverlay();
  }

  function fitView() {
    const viewportRect = elements.viewport.getBoundingClientRect();
    const horizontalPadding = 44;
    const verticalPadding = 44;
    if (viewportRect.width <= horizontalPadding || viewportRect.height <= verticalPadding) {
      return;
    }
    const targetZoom = Math.min((viewportRect.width - horizontalPadding) / state.sheet.exportWidth, (viewportRect.height - verticalPadding) / state.sheet.height);
    state.zoom = clamp(Math.floor(targetZoom), ZOOM_MIN, ZOOM_MAX);
    state.panX = Math.round((viewportRect.width - state.sheet.exportWidth * state.zoom) / 2);
    state.panY = Math.round((viewportRect.height - state.sheet.height * state.zoom) / 2);
    state.hasFittedView = true;
    updateStageTransform();
  }

  function keepStageVisible() {
    const viewportRect = elements.viewport.getBoundingClientRect();
    if (!viewportRect.width || !viewportRect.height) {
      return;
    }
    const visibleMargin = 40;
    const stageWidth = state.sheet.exportWidth * state.zoom;
    const stageHeight = state.sheet.height * state.zoom;
    const stageRight = state.panX + stageWidth;
    const stageBottom = state.panY + stageHeight;
    if (stageRight < visibleMargin || state.panX > viewportRect.width - visibleMargin) {
      state.panX = Math.round((viewportRect.width - stageWidth) / 2);
    }
    if (stageBottom < visibleMargin || state.panY > viewportRect.height - visibleMargin) {
      state.panY = Math.round((viewportRect.height - stageHeight) / 2);
    }
  }

  function updateStageTransform() {
    elements.stage.style.transform = "translate(" + state.panX + "px, " + state.panY + "px) scale(" + state.zoom + ")";
    elements.zoomReadout.textContent = formatNumber(state.zoom, 1) + "x";
    drawOverlay();
  }

  function updateViewportCursor() {
    elements.viewport.classList.toggle("tool-pen", state.tool === "pen" && !state.isSpaceHeld);
    elements.viewport.classList.toggle("tool-eraser", state.tool === "eraser" && !state.isSpaceHeld);
    elements.viewport.classList.toggle("tool-picker", state.tool === "picker" && !state.isSpaceHeld);
    elements.viewport.classList.toggle("tool-select", state.tool === "select" && !state.isSpaceHeld);
    elements.viewport.classList.toggle("is-space-pan", state.isSpaceHeld);
    elements.viewport.classList.toggle("is-panning", state.pointer.panning);
  }

  function applySheetMetrics(options) {
    const previousSheet = { artWidth: state.sheet.artWidth, exportWidth: state.sheet.exportWidth, height: state.sheet.height };
    const preservedView = options && options.preserveView ? options.preserveView : null;
    syncFeatureConstraints();
    const baseSheet = computeBaseSheet(state.layoutMode, state.includeRock, state.includeParticles);
    const activeMetapixels = getEncodedMetapixels();
    const metaColumnWidth = Number(state.metaSchema.metaColumnWidth || 1);
    state.sheet = {
      artWidth: baseSheet.artWidth,
      height: baseSheet.height,
      hasMeta: activeMetapixels.length > 0,
      exportWidth: baseSheet.artWidth + (activeMetapixels.length > 0 ? metaColumnWidth : 0),
      activeMetapixels: activeMetapixels,
    };
    const artSizeChanged = previousSheet.artWidth !== state.sheet.artWidth || previousSheet.height !== state.sheet.height;
    const exportChanged = previousSheet.exportWidth !== state.sheet.exportWidth;
    if (artSizeChanged) {
      clearSelection({ preserveClipboard: true });
      resizeLayerCanvases();
    }
    if (artSizeChanged || exportChanged) {
      syncStageDimensions();
      syncLayerStack();
    }
    if ((options && options.fitView) || (!state.hasFittedView && artSizeChanged && !preservedView)) {
      fitView();
    } else {
      if (preservedView) {
        state.zoom = preservedView.zoom;
        state.panX = preservedView.panX;
        state.panY = preservedView.panY;
        state.hasFittedView = preservedView.hasFittedView;
      }
      if (artSizeChanged || exportChanged || preservedView) {
        keepStageVisible();
      }
      updateStageTransform();
    }
    renderStats();
    renderParticlePrompt();
    renderMetaPreviewBar();
    renderDuckReference();
    renderGuideLayer();
    drawOverlay();
    if (options && options.revealFrameLabels) {
      showFrameLabelsTemporarily();
    }
    if (state.isMetaModalOpen) {
      if (options && options.skipMetaModalRebuild) {
        updateMetapixelModalReadouts();
      } else {
        renderMetapixelModal();
      }
    }
  }

  function drawOverlay() {
    const viewportMetrics = syncOverlayCanvasToViewport();
    if (!viewportMetrics.width || !viewportMetrics.height) {
      return;
    }

    const stageLeft = artToScreenX(0);
    const stageTop = artToScreenY(0);
    const artRight = artToScreenX(state.sheet.artWidth);
    const stageBottom = artToScreenY(state.sheet.height);

    if (state.showGrid && state.zoom >= GRID_MIN_ZOOM) {
      overlayContext.strokeStyle = "rgba(255, 255, 255, 0.28)";
      overlayContext.lineWidth = 1;
      overlayContext.beginPath();
      for (let x = 1; x < state.sheet.artWidth; x += 1) {
        const screenX = artBoundaryToScreenX(x);
        overlayContext.moveTo(screenX, stageTop);
        overlayContext.lineTo(screenX, stageBottom);
      }
      for (let y = 1; y < state.sheet.height; y += 1) {
        const screenY = artBoundaryToScreenY(y);
        overlayContext.moveTo(stageLeft, screenY);
        overlayContext.lineTo(artRight, screenY);
      }
      overlayContext.stroke();
    }

    if (state.sheet.hasMeta) {
      const metaX = artToScreenX(state.sheet.artWidth);
      const metaWidth = Math.max(1, Math.round((state.sheet.exportWidth - state.sheet.artWidth) * state.zoom));
      const metaHeight = Math.max(1, Math.round(state.sheet.height * state.zoom));
      overlayContext.fillStyle = "rgba(255, 79, 135, 0.18)";
      overlayContext.fillRect(metaX, stageTop, metaWidth, metaHeight);
      state.sheet.activeMetapixels.forEach(function (pixel) {
        overlayContext.fillStyle = "rgb(" + pixel.r + ", " + pixel.g + ", " + pixel.b + ")";
        overlayContext.fillRect(metaX, artToScreenY(pixel.row), metaWidth, Math.max(1, Math.round(state.zoom)));
      });
    }

    drawSelectionOverlay();
    drawFrameLabelsOverlay();
  }

  function buildExportCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = state.sheet.exportWidth;
    canvas.height = state.sheet.height;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    state.layers.forEach(function (layer) {
      if (!layer.visible) {
        return;
      }
      context.globalAlpha = layer.opacity;
      context.drawImage(layer.canvas, 0, 0);
    });
    context.globalAlpha = 1;
    if (state.sheet.hasMeta) {
      const metaX = state.sheet.artWidth;
      state.sheet.activeMetapixels.forEach(function (pixel) {
        context.fillStyle = "rgb(" + pixel.r + ", " + pixel.g + ", " + pixel.b + ")";
        context.fillRect(metaX, pixel.row, 1, 1);
      });
    }
    return canvas;
  }

  function downloadHat() {
    const canvas = buildExportCanvas();
    const link = document.createElement("a");
    link.download = "duck-game-hat.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function getCanvasPointFromClient(clientX, clientY) {
    const rect = elements.stage.getBoundingClientRect();
    if (clientX < rect.left || clientY < rect.top || clientX > rect.right || clientY > rect.bottom) {
      return null;
    }
    const x = Math.floor((clientX - rect.left) / state.zoom);
    const y = Math.floor((clientY - rect.top) / state.zoom);
    if (x < 0 || y < 0 || x >= state.sheet.artWidth || y >= state.sheet.height) {
      return null;
    }
    return { x: x, y: y };
  }

  function getClampedCanvasPointFromClient(clientX, clientY) {
    const rect = elements.stage.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }
    const maxX = Math.max(0, state.sheet.artWidth - 1);
    const maxY = Math.max(0, state.sheet.height - 1);
    return {
      x: clamp(Math.floor((clientX - rect.left) / state.zoom), 0, maxX),
      y: clamp(Math.floor((clientY - rect.top) / state.zoom), 0, maxY),
    };
  }

  function sampleColorAtPoint(point) {
    for (let index = state.layers.length - 1; index >= 0; index -= 1) {
      const layer = state.layers[index];
      if (!layer.visible) {
        continue;
      }
      const pixel = layer.context.getImageData(point.x, point.y, 1, 1).data;
      if (!pixel[3]) {
        continue;
      }
      const toHex = function (value) {
        return value.toString(16).padStart(2, "0");
      };
      return "#" + toHex(pixel[0]) + toHex(pixel[1]) + toHex(pixel[2]);
    }
    return null;
  }

  function applyToolAtPoint(point) {
    if (state.tool === "picker") {
      const sampled = sampleColorAtPoint(point);
      if (sampled) {
        setActiveColor(sampled);
      }
      return;
    }
    const layer = getActiveLayer();
    if (!layer) {
      return;
    }
    if (state.tool === "eraser") {
      layer.context.clearRect(point.x, point.y, 1, 1);
    } else {
      layer.context.fillStyle = state.activeColor;
      layer.context.fillRect(point.x, point.y, 1, 1);
    }
    state.pointer.strokeDirty = true;
  }

  function drawLineOnLayer(startPoint, endPoint) {
    let x0 = startPoint.x;
    let y0 = startPoint.y;
    const x1 = endPoint.x;
    const y1 = endPoint.y;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let error = dx - dy;

    while (true) {
      applyToolAtPoint({ x: x0, y: y0 });
      if (x0 === x1 && y0 === y1) {
        break;
      }
      const doubled = error * 2;
      if (doubled > -dy) {
        error -= dy;
        x0 += sx;
      }
      if (doubled < dx) {
        error += dx;
        y0 += sy;
      }
    }
  }

  function beginDrawing(point) {
    if (!point) {
      return;
    }
    if (state.tool === "picker") {
      applyToolAtPoint(point);
      return;
    }
    state.pointer.drawing = true;
    state.pointer.lastCanvasPoint = point;
    state.pointer.strokeDirty = false;
    drawLineOnLayer(point, point);
  }

  function extendDrawing(point) {
    if (!state.pointer.drawing || !point) {
      return;
    }
    const lastPoint = state.pointer.lastCanvasPoint || point;
    drawLineOnLayer(lastPoint, point);
    state.pointer.lastCanvasPoint = point;
  }

  function finishPointerSession(event) {
    const shouldCommitStroke = state.pointer.drawing && state.pointer.strokeDirty;
    const isDraftingSelection = Boolean(state.pointer.selectionStart && state.pointer.selectionCurrent);
    const isMovingSelection = Boolean(state.selection && state.selection.isFloating);
    if (state.pointer.pointerId != null) {
      try {
        elements.viewport.releasePointerCapture(state.pointer.pointerId);
      } catch (error) {
      }
    }
    state.pointer.drawing = false;
    state.pointer.panning = false;
    state.pointer.pointerId = null;
    state.pointer.lastCanvasPoint = null;
    state.pointer.strokeDirty = false;
    if (isDraftingSelection) {
      finishSelectionDraft(event ? event.clientX : 0, event ? event.clientY : 0);
    }
    if (isMovingSelection) {
      finishSelectionMove();
      clearSelectionPointerState();
    }
    updateViewportCursor();
    if (shouldCommitStroke) {
      renderLayerList();
      commitHistory();
    }
  }

  function zoomAt(clientX, clientY, delta) {
    const viewportRect = elements.viewport.getBoundingClientRect();
    const localX = clientX - viewportRect.left;
    const localY = clientY - viewportRect.top;
    const oldZoom = state.zoom;
    const nextZoom = clamp(oldZoom + delta, ZOOM_MIN, ZOOM_MAX);
    if (nextZoom === oldZoom) {
      return;
    }
    const stageX = (localX - state.panX) / oldZoom;
    const stageY = (localY - state.panY) / oldZoom;
    state.zoom = nextZoom;
    state.panX = Math.round(localX - stageX * nextZoom);
    state.panY = Math.round(localY - stageY * nextZoom);
    state.hasFittedView = false;
    updateStageTransform();
    renderStats();
  }

  function handlePointerDown(event) {
    if (elements.selectionActionCard && elements.selectionActionCard.contains(event.target)) {
      return;
    }
    if (event.button === 1 || state.isSpaceHeld) {
      state.pointer.panning = true;
      state.pointer.pointerId = event.pointerId;
      state.pointer.lastClientX = event.clientX;
      state.pointer.lastClientY = event.clientY;
      elements.viewport.setPointerCapture(event.pointerId);
      updateViewportCursor();
      return;
    }
    if (event.button !== 0) {
      return;
    }

    state.pointer.lastClientX = event.clientX;
    state.pointer.lastClientY = event.clientY;

    if (state.tool === "select") {
      const selectionPoint = getClampedCanvasPointFromClient(event.clientX, event.clientY);
      if (!selectionPoint) {
        clearSelection({ preserveClipboard: true });
        return;
      }
      state.pointer.pointerId = event.pointerId;
      elements.viewport.setPointerCapture(event.pointerId);
      if (state.selection && pointIntersectsSelection(selectionPoint)) {
        beginSelectionMove(selectionPoint);
      } else {
        clearSelection({ preserveClipboard: true });
        beginSelectionDraft(selectionPoint);
      }
      updateViewportCursor();
      return;
    }

    const point = getCanvasPointFromClient(event.clientX, event.clientY);
    if (!point) {
      return;
    }
    hideSelectionActionCard();
    state.pointer.pointerId = event.pointerId;
    elements.viewport.setPointerCapture(event.pointerId);
    beginDrawing(point);
    updateViewportCursor();
  }

  function handlePointerMove(event) {
    if (state.pointer.panning) {
      state.panX += event.clientX - state.pointer.lastClientX;
      state.panY += event.clientY - state.pointer.lastClientY;
      state.pointer.lastClientX = event.clientX;
      state.pointer.lastClientY = event.clientY;
      state.hasFittedView = false;
      updateStageTransform();
      return;
    }
    if (state.pointer.selectionStart) {
      updateSelectionDraft(getClampedCanvasPointFromClient(event.clientX, event.clientY));
      return;
    }
    if (state.selection && state.selection.isFloating) {
      updateFloatingSelection(getClampedCanvasPointFromClient(event.clientX, event.clientY));
      return;
    }
    if (!state.pointer.drawing) {
      return;
    }
    const point = getCanvasPointFromClient(event.clientX, event.clientY);
    if (!point) {
      return;
    }
    extendDrawing(point);
  }

  function handlePointerUp(event) {
    finishPointerSession(event);
  }

  function createHistorySnapshot() {
    return {
      layoutMode: state.layoutMode,
      includeRock: state.includeRock,
      includeParticles: state.includeParticles,
      showGrid: state.showGrid,
      showGuides: state.showGuides,
      showDuckReference: state.showDuckReference,
      activeColor: state.activeColor,
      activeLayerId: state.activeLayerId,
      layerCounter: state.layerCounter,
      background: cloneSimple(state.background),
      metapixelValues: cloneSimple(state.metapixelValues),
      layers: state.layers.map(function (layer) {
        return {
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          width: layer.canvas.width,
          height: layer.canvas.height,
          data: Array.from(layer.context.getImageData(0, 0, layer.canvas.width, layer.canvas.height).data),
        };
      }),
    };
  }

  function commitHistory() {
    if (state.isRestoringHistory) {
      return;
    }
    state.history.undo.push(createHistorySnapshot());
    if (state.history.undo.length > HISTORY_LIMIT) {
      state.history.undo.shift();
    }
    state.history.redo = [];
    renderStats();
  }

  function restoreSnapshot(snapshot) {
    clearSelection({ preserveClipboard: true });
    const viewState = {
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      hasFittedView: state.hasFittedView,
    };
    state.isRestoringHistory = true;
    state.layoutMode = snapshot.layoutMode;
    state.includeRock = snapshot.includeRock;
    state.includeParticles = snapshot.includeParticles;
    state.showGrid = snapshot.showGrid;
    state.showGuides = snapshot.showGuides;
    state.showDuckReference = Boolean(snapshot.showDuckReference) && state.duckReferenceAssets.hasAny;
    state.activeColor = snapshot.activeColor;
    state.background = normalizeBackgroundState(snapshot.background);
    state.metapixelValues = cloneSimple(snapshot.metapixelValues);
    state.layers = [];
    state.layerCounter = 0;
    snapshot.layers.forEach(function (layerSnapshot) {
      const layer = createLayer(layerSnapshot.name, layerSnapshot.id, layerSnapshot.width, layerSnapshot.height);
      layer.visible = layerSnapshot.visible;
      layer.opacity = layerSnapshot.opacity;
      const imageData = new ImageData(new Uint8ClampedArray(layerSnapshot.data), layerSnapshot.width, layerSnapshot.height);
      layer.context.putImageData(imageData, 0, 0);
      state.layers.push(layer);
    });
    state.layerCounter = snapshot.layerCounter;
    state.activeLayerId = snapshot.activeLayerId;
    if (!state.layers.some(function (layer) { return layer.id === state.activeLayerId; })) {
      state.activeLayerId = state.layers.length ? state.layers[0].id : null;
    }
    setActiveColor(state.activeColor);
    applyStageBackground();
    syncLayerStack();
    state.isRestoringHistory = false;
    applySheetMetrics({ preserveView: viewState });
    renderLayerList();
    renderStats();
  }

  function undo() {
    if (state.history.undo.length <= 1) {
      return;
    }
    const current = state.history.undo.pop();
    state.history.redo.push(current);
    restoreSnapshot(state.history.undo[state.history.undo.length - 1]);
    renderStats();
  }

  function redo() {
    if (!state.history.redo.length) {
      return;
    }
    const snapshot = state.history.redo.pop();
    state.history.undo.push(snapshot);
    restoreSnapshot(snapshot);
    renderStats();
  }

  function isEditingField(target) {
    if (!(target instanceof Element)) {
      return false;
    }
    return target.matches('input, select, textarea') || target.isContentEditable;
  }

  function openMetapixelModal() {
    closeDrawer();
    if (!state.metaSelection) {
      state.metaSelection = chooseDefaultMetapixelId();
    }
    if (state.metaCategoryFilter === "all") {
      const selectedDefinition = getDefinitionById(state.metaSelection);
      if (selectedDefinition) {
        state.metaCategoryFilter = selectedDefinition.category;
      }
    }
    state.isMetaModalOpen = true;
    renderMetapixelModal();
  }

  function closeMetapixelModal() {
    state.isMetaModalOpen = false;
    renderMetapixelModal();
  }

  function getFilteredDefinitions() {
    const visibleDefinitions = state.metapixelDefs.filter(function (definition) {
      return state.metaCategoryFilter === "all" || definition.category === state.metaCategoryFilter;
    });
    return visibleDefinitions.length ? visibleDefinitions : state.metapixelDefs.slice();
  }
  function getMetapixelActivationState(value, availability) {
    return availability.available && Boolean(value && value.enabled);
  }

  function syncMetapixelActivationUi(value, availability, button, note) {
    if (!button || !note) {
      return;
    }
    const isActive = getMetapixelActivationState(value, availability);
    button.textContent = isActive ? "Active" : "Inactive";
    button.className = "meta-activation-button" + (isActive ? " is-active" : " is-inactive");
    button.disabled = !availability.available;
    button.setAttribute("aria-pressed", value && value.enabled ? "true" : "false");
    note.textContent = availability.available ? "" : availability.reason;
    note.classList.toggle("is-hidden", availability.available);
  }
  function createMetapixelRangeControl(definition, field, value, availability, activationUi) {
    const card = document.createElement("div");
    card.className = "meta-control-card";
    const row = document.createElement("div");
    row.className = "control-row";
    const label = document.createElement("label");
    label.textContent = field.label;
    const range = document.createElement("input");
    range.type = "range";
    range.min = String(field.min);
    range.max = String(field.max);
    range.step = String(field.step);
    range.value = String(value[field.key]);
    range.disabled = !availability.available;
    const number = document.createElement("input");
    number.type = "number";
    number.min = String(field.min);
    number.max = String(field.max);
    number.step = String(field.step);
    number.value = String(value[field.key]);
    number.disabled = !availability.available;

    function commit(nextValue, remember) {
      value[field.key] = normalizeFieldValue(field, nextValue);
      range.value = String(value[field.key]);
      number.value = String(value[field.key]);
      if (definition.activation.mode === "optional") {
        value.enabled = true;
      }
      syncMetapixelActivationUi(value, availability, activationUi && activationUi.button, activationUi && activationUi.note);
      applySheetMetrics({ skipMetaModalRebuild: true });
      if (remember) {
        commitHistory();
      }
    }

    range.addEventListener("input", function () {
      commit(range.value, false);
    });
    range.addEventListener("change", function () {
      commit(range.value, true);
    });
    number.addEventListener("input", function () {
      commit(number.value, false);
    });
    number.addEventListener("change", function () {
      commit(number.value, true);
    });

    row.appendChild(label);
    row.appendChild(range);
    row.appendChild(number);
    card.appendChild(row);
    return card;
  }

  function createMetapixelSelectControl(definition, field, value, availability, activationUi) {
    const card = document.createElement("div");
    card.className = "meta-control-card";
    const fieldWrap = document.createElement("label");
    fieldWrap.className = "field";
    const label = document.createElement("span");
    label.className = "field-label";
    label.textContent = field.label;
    const select = document.createElement("select");
    select.disabled = !availability.available;
    (field.options || []).forEach(function (option) {
      const optionElement = document.createElement("option");
      optionElement.value = String(option.value);
      optionElement.textContent = option.label + " (" + option.value + ")";
      select.appendChild(optionElement);
    });
    select.value = String(value[field.key]);
    select.addEventListener("change", function () {
      value[field.key] = normalizeFieldValue(field, select.value);
      if (definition.activation.mode === "optional") {
        value.enabled = true;
      }
      syncMetapixelActivationUi(value, availability, activationUi && activationUi.button, activationUi && activationUi.note);
      applySheetMetrics({ skipMetaModalRebuild: true });
      commitHistory();
    });
    fieldWrap.appendChild(label);
    fieldWrap.appendChild(select);
    card.appendChild(fieldWrap);
    return card;
  }

  function updateMetapixelModalReadouts() {
    if (!state.isMetaModalOpen) {
      return;
    }
    const definition = getDefinitionById(state.metaSelection);
    if (!definition) {
      return;
    }

    if (!state.sheet.activeMetapixels.length) {
      const empty = document.createElement("div");
      empty.className = "meta-empty";
      empty.textContent = "No active metapixels.";
      elements.activeMetaList.replaceChildren(empty);
      return;
    }

    const activeFragment = document.createDocumentFragment();
    state.sheet.activeMetapixels.forEach(function (pixel) {
      const row = document.createElement("div");
      row.className = "active-meta-row";
      const swatch = document.createElement("div");
      swatch.className = "meta-color";
      swatch.style.background = "rgb(" + pixel.r + ", " + pixel.g + ", " + pixel.b + ")";
      const info = document.createElement("div");
      const heading = document.createElement("strong");
      heading.textContent = pixel.name;
      info.appendChild(heading);
      const valueChip = document.createElement("span");
      valueChip.className = "value-chip";
      valueChip.textContent = pixel.r + ", " + pixel.g + ", " + pixel.b;
      const removeButton = createIconButton("trash", "Remove metapixel", "meta-action-button");
      removeButton.addEventListener("click", function () {
        disableMetapixel(pixel.id);
      });
      row.appendChild(swatch);
      row.appendChild(info);
      row.appendChild(valueChip);
      row.appendChild(removeButton);
      activeFragment.appendChild(row);
    });
    elements.activeMetaList.replaceChildren(activeFragment);
  }

  function renderMetapixelModal() {
    elements.metaModalBackdrop.classList.toggle("is-hidden", !state.isMetaModalOpen);
    elements.metaModalBackdrop.setAttribute("aria-hidden", state.isMetaModalOpen ? "false" : "true");
    if (!state.isMetaModalOpen) {
      return;
    }
    const definitions = getFilteredDefinitions();
    if (!definitions.some(function (definition) {
      return definition.id === state.metaSelection;
    })) {
      state.metaSelection = definitions.length ? definitions[0].id : chooseDefaultMetapixelId();
    }
    const selectedDefinition = getDefinitionById(state.metaSelection);
    if (!selectedDefinition) {
      return;
    }

    const filterFragment = document.createDocumentFragment();
    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "meta-filter-button" + (state.metaCategoryFilter === "all" ? " is-active" : "");
    allButton.textContent = "All";
    allButton.addEventListener("click", function () {
      state.metaCategoryFilter = "all";
      renderMetapixelModal();
    });
    filterFragment.appendChild(allButton);
    state.metaSchema.categories.forEach(function (category) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "meta-filter-button" + (state.metaCategoryFilter === category.id ? " is-active" : "");
      button.textContent = category.label;
      button.addEventListener("click", function () {
        state.metaCategoryFilter = category.id;
        renderMetapixelModal();
      });
      filterFragment.appendChild(button);
    });
    elements.metaCategoryFilters.replaceChildren(filterFragment);

    const categoryOrder = state.metaCategoryFilter === "all"
      ? state.metaSchema.categories
      : state.metaSchema.categories.filter(function (category) {
          return category.id === state.metaCategoryFilter;
        });
    const selectFragment = document.createDocumentFragment();
    categoryOrder.forEach(function (category) {
      const inCategory = state.metapixelDefs.filter(function (definition) {
        return definition.category === category.id && (state.metaCategoryFilter === "all" || definition.category === state.metaCategoryFilter);
      });
      if (!inCategory.length) {
        return;
      }
      const group = document.createElement("optgroup");
      group.label = category.label;
      inCategory.forEach(function (definition) {
        const option = document.createElement("option");
        option.value = String(definition.id);
        option.textContent = definition.name;
        group.appendChild(option);
      });
      selectFragment.appendChild(group);
    });
    elements.metaDefinitionSelect.replaceChildren(selectFragment);
    elements.metaDefinitionSelect.value = String(selectedDefinition.id);

    elements.metaDefinitionName.textContent = selectedDefinition.name;
    elements.metaDefinitionDescription.textContent = selectedDefinition.description || "";

    const controlsFragment = document.createDocumentFragment();
    const value = state.metapixelValues[selectedDefinition.id];
    const availability = getDefinitionAvailability(selectedDefinition);
    const activationCard = document.createElement("div");
    activationCard.className = "meta-activation-card meta-control-card";
    const activationButton = document.createElement("button");
    activationButton.type = "button";
    const activationNote = document.createElement("p");
    activationNote.className = "meta-activation-note is-hidden";
    syncMetapixelActivationUi(value, availability, activationButton, activationNote);
    activationButton.addEventListener("click", function () {
      if (!availability.available) {
        return;
      }
      value.enabled = !value.enabled;
      syncMetapixelActivationUi(value, availability, activationButton, activationNote);
      applySheetMetrics({ skipMetaModalRebuild: true });
      commitHistory();
    });
    activationCard.appendChild(activationButton);
    activationCard.appendChild(activationNote);
    controlsFragment.appendChild(activationCard);

    if ((selectedDefinition.fields || []).length) {
      const activationUi = { button: activationButton, note: activationNote };
      selectedDefinition.fields.forEach(function (field) {
        if (field.control === "select") {
          controlsFragment.appendChild(createMetapixelSelectControl(selectedDefinition, field, value, availability, activationUi));
          return;
        }
        controlsFragment.appendChild(createMetapixelRangeControl(selectedDefinition, field, value, availability, activationUi));
      });
    }

    elements.metaControls.replaceChildren(controlsFragment);
    updateMetapixelModalReadouts();
  }

  function disableMetapixel(definitionId) {
    const definition = getDefinitionById(definitionId);
    if (!definition) {
      return;
    }
    const value = state.metapixelValues[definition.id];
    if (!value || !value.enabled) {
      return;
    }
    value.enabled = false;
    applySheetMetrics();
    if (state.isMetaModalOpen) {
      renderMetapixelModal();
    }
    commitHistory();
  }

  function resetSelectedMetapixel() {
    const definition = getDefinitionById(state.metaSelection);
    if (!definition) {
      return;
    }
    state.metapixelValues[definition.id] = createDefaultMetapixelValue(definition);
    applySheetMetrics();
    renderMetapixelModal();
    commitHistory();
  }


  async function setBackgroundImageFromFile(file) {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadEditorImage(dataUrl);
    if (!image) {
      throw new Error("Unable to read that background image.");
    }
    state.background.imageDataUrl = dataUrl;
    state.background.imageName = file.name;
  }

  function bindEvents() {
    Array.from(elements.tabStrip.querySelectorAll("[data-tab]")).forEach(function (button) {
      button.addEventListener("click", function () {
        setActiveTab(button.dataset.tab, button);
      });
    });

    window.addEventListener("pointerdown", function (event) {
      if (!state.activeTab) {
        return;
      }
      const target = event.target;
      if (elements.controlTray.contains(target) || elements.tabStrip.contains(target)) {
        return;
      }
      closeDrawer();
    });

    if (elements.selectionActionCard) {
      elements.selectionActionCard.addEventListener("pointerdown", function (event) {
        event.stopPropagation();
      });
      elements.selectionActionCard.addEventListener("click", function (event) {
        event.stopPropagation();
      });
    }

    elements.layoutSelect.addEventListener("change", function () {
      state.layoutMode = elements.layoutSelect.value;
      applySheetMetrics({ fitView: true, revealFrameLabels: true });
      renderLayerList();
      commitHistory();
    });

    elements.rockToggle.addEventListener("change", function () {
      state.includeRock = elements.rockToggle.checked;
      if (!state.includeRock) {
        state.includeParticles = false;
      }
      applySheetMetrics({ fitView: true, revealFrameLabels: true });
      commitHistory();
    });

    elements.particlesToggle.addEventListener("change", function () {
      state.includeParticles = elements.particlesToggle.checked;
      applySheetMetrics({ fitView: true, revealFrameLabels: true });
      commitHistory();
    });

    elements.gridToggle.addEventListener("change", function () {
      state.showGrid = elements.gridToggle.checked;
      drawOverlay();
      renderStats();
      commitHistory();
    });

    elements.guidesToggle.addEventListener("change", function () {
      state.showGuides = elements.guidesToggle.checked;
      renderGuideLayer();
      renderStats();
      commitHistory();
    });

    elements.duckReferenceToggle.addEventListener("change", function () {
      state.showDuckReference = elements.duckReferenceToggle.checked && state.duckReferenceAssets.hasAny;
      renderDuckReference();
      renderStats();
      commitHistory();
    });

    elements.fitViewBtn.addEventListener("click", function () {
      fitView();
    });

    elements.accentThemeBtn.addEventListener("click", function () {
      positionAccentThemeInput();
      elements.accentThemeInput.click();
    });

    elements.accentThemeInput.addEventListener("input", function () {
      applyAccentTheme(elements.accentThemeInput.value);
    });

    elements.accentThemeInput.addEventListener("change", function () {
      applyAccentTheme(elements.accentThemeInput.value);
    });

    elements.importHatBtn.addEventListener("click", function () {
      elements.importHatInput.click();
    });

    elements.importHatInput.addEventListener("change", async function () {
      const file = elements.importHatInput.files && elements.importHatInput.files[0];
      if (!file) {
        return;
      }
      await importHatFile(file);
      elements.importHatInput.value = "";
    });

    elements.downloadBtn.addEventListener("click", function () {
      downloadHat();
    });

    elements.undoBtn.addEventListener("click", function () {
      undo();
    });

    elements.redoBtn.addEventListener("click", function () {
      redo();
    });

    elements.addLayerBtn.addEventListener("click", function () {
      addLayer();
    });

    Array.from(elements.toolButtons.querySelectorAll("[data-tool]")).forEach(function (button) {
      button.addEventListener("click", function () {
        setTool(button.dataset.tool);
      });
    });

    elements.pasteSelectionBtn.addEventListener("click", function () {
      pasteClipboardSelection();
    });

    elements.selectionCopyBtn.addEventListener("click", function () {
      copySelectionToClipboard();
    });

    elements.selectionCutBtn.addEventListener("click", function () {
      cutSelectionToClipboard();
    });

    elements.selectionDeleteBtn.addEventListener("click", function () {
      deleteSelectedPixels();
    });

    elements.colorInput.addEventListener("input", function () {
      setActiveColor(elements.colorInput.value);
    });

    elements.saveColorBtn.addEventListener("click", function () {
      saveCurrentColor();
    });

    elements.backgroundTextureSelect.addEventListener("change", function () {
      state.background.texture = elements.backgroundTextureSelect.value;
      applyStageBackground();
      renderStats();
      commitHistory();
    });

    elements.backgroundColorInput.addEventListener("input", function () {
      state.background.color = elements.backgroundColorInput.value.toLowerCase();
      applyStageBackground();
      renderStats();
    });

    elements.backgroundColorInput.addEventListener("change", function () {
      state.background.color = elements.backgroundColorInput.value.toLowerCase();
      applyStageBackground();
      renderStats();
      commitHistory();
    });


    elements.uploadBackgroundBtn.addEventListener("click", function () {
      elements.backgroundImageInput.click();
    });

    elements.clearBackgroundBtn.addEventListener("click", function () {
      if (!state.background.imageDataUrl) {
        return;
      }
      state.background.imageDataUrl = "";
      state.background.imageName = "";
      applyStageBackground();
      renderStats();
      commitHistory();
    });


    elements.backgroundImageInput.addEventListener("change", async function () {
      const file = elements.backgroundImageInput.files && elements.backgroundImageInput.files[0];
      if (!file) {
        return;
      }
      try {
        await setBackgroundImageFromFile(file);
        applyStageBackground();
        renderStats();
        commitHistory();
      } catch (error) {
        window.alert(error && error.message ? error.message : "Unable to read that background image.");
      }
      elements.backgroundImageInput.value = "";
    });

    elements.openMetapixelsPromptBtn.addEventListener("click", function () {
      openMetapixelModal();
    });

    elements.closeMetaModalBtn.addEventListener("click", function () {
      closeMetapixelModal();
    });

    elements.doneMetaBtn.addEventListener("click", function () {
      closeMetapixelModal();
    });

    elements.resetMetaBtn.addEventListener("click", function () {
      resetSelectedMetapixel();
    });

    elements.metaDefinitionSelect.addEventListener("change", function () {
      state.metaSelection = Number(elements.metaDefinitionSelect.value);
      renderMetapixelModal();
    });

    elements.metaModalBackdrop.addEventListener("click", function (event) {
      if (event.target === elements.metaModalBackdrop) {
        closeMetapixelModal();
      }
    });

    elements.viewport.addEventListener("pointerdown", handlePointerDown);
    elements.viewport.addEventListener("pointermove", handlePointerMove);
    elements.viewport.addEventListener("pointerup", handlePointerUp);
    elements.viewport.addEventListener("pointercancel", handlePointerUp);
    elements.viewport.addEventListener("wheel", function (event) {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1 : -1);
    });

    window.addEventListener("keydown", function (event) {
      const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
      const isRedo = (event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"));

      if (isUndo) {
        event.preventDefault();
        undo();
        return;
      }

      if (isRedo) {
        event.preventDefault();
        redo();
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        state.isSpaceHeld = true;
        updateViewportCursor();
      }

      if (event.key === "Alt" && !state.isAltHeld && !isEditingField(event.target)) {
        state.isAltHeld = true;
        if (state.tool !== "picker") {
          state.tempToolReturn = state.tool;
          setTool("picker");
        }
        return;
      }

      if (event.key === "Escape") {
        if (state.isMetaModalOpen) {
          closeMetapixelModal();
          return;
        }
        if (state.activeTab) {
          closeDrawer();
          return;
        }
        if (state.selection) {
          clearSelection({ preserveClipboard: true });
          return;
        }
      }

      if (isEditingField(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "q") {
        event.preventDefault();
        toggleDrawTool();
        return;
      }
      if (key === "i") {
        event.preventDefault();
        setTool("picker");
        return;
      }
      if (key === "g") {
        event.preventDefault();
        if (event.shiftKey) {
          state.showGuides = !state.showGuides;
          elements.guidesToggle.checked = state.showGuides;
          renderGuideLayer();
        } else {
          state.showGrid = !state.showGrid;
          elements.gridToggle.checked = state.showGrid;
          drawOverlay();
        }
        renderStats();
        commitHistory();
        return;
      }
      if (key === "m") {
        event.preventDefault();
        openMetapixelModal();
        return;
      }
      if (key === "f") {
        event.preventDefault();
        fitView();
        return;
      }
      if (key === "1") {
        event.preventDefault();
        setActiveTab("setup");
        return;
      }
      if (key === "2") {
        event.preventDefault();
        setActiveTab("tools");
        return;
      }
      if (key === "3") {
        event.preventDefault();
        setActiveTab("scene");
        return;
      }
      if (key === "4") {
        event.preventDefault();
        setActiveTab("overlays");
      }
    });

    window.addEventListener("keyup", function (event) {
      if (event.code === "Space") {
        state.isSpaceHeld = false;
        updateViewportCursor();
      }
      if (event.key === "Alt") {
        state.isAltHeld = false;
        if (state.tempToolReturn) {
          const toolToRestore = state.tempToolReturn;
          state.tempToolReturn = null;
          setTool(toolToRestore);
        }
      }
    });

    window.addEventListener("resize", function () {
      if (state.activeTab) {
        renderTrayState();
      }
      if (state.hasFittedView) {
        fitView();
      } else {
        keepStageVisible();
        updateStageTransform();
      }
    });
  }

  async function initialize() {
    const schema = await loadMetapixelSchema();
    applySchema(schema);
    await loadDuckReferenceAssets();
    applyAccentTheme(loadAccentTheme());
    initializeStaticUi();
    positionAccentThemeInput();
    syncStageDimensions();
    addLayer({ skipHistory: true });
    renderTrayState();
    renderPalette();
    setActiveColor(state.activeColor);
    renderToolState();
    applyStageBackground();
    bindEvents();
    applySheetMetrics({ fitView: true, revealFrameLabels: true });
    renderMetapixelModal();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fitView();
        renderTrayState();
      });
    });
    commitHistory();
  }

  initialize();
})();



























