/**
 * PIXEL Sports Graphics System — Motion Engine (Phase G2)
 * 
 * Standardized broadcast animation foundation powered by Anime.js v4.
 * Provides broadcast-tuned motion presets (SUBTLE, STANDARD, HERO),
 * collision-safe animation replacement, and prefers-reduced-motion support.
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['animejs'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('animejs'));
  } else {
    // In standalone browser HTML, anime is available globally from anime.min.js
    const animeLib = root.anime || (typeof window !== 'undefined' && window.anime);
    root.PixelMotion = factory(animeLib);
  }
}(typeof self !== 'undefined' ? self : this, function(animeInstance) {
  'use strict';

  // Fallback / extraction of Anime.js v4 functions
  const anime = animeInstance || (typeof window !== 'undefined' ? window.anime : null);
  const animate = anime?.animate || (typeof anime === 'function' ? anime : null);
  const createTimeline = anime?.createTimeline || null;
  const stagger = anime?.stagger || null;
  const remove = anime?.remove || null;

  // Reduced motion detection
  function prefersReducedMotion() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  // Broadcast Motion Presets
  const Presets = Object.freeze({
    SUBTLE: {
      enterDuration: 450,
      exitDuration: 300,
      updateDuration: 240,
      enterEase: 'outCubic',
      exitEase: 'inQuad',
      updateEase: 'outQuad',
      distance: 24,
      scaleFrom: 0.98,
      stagger: 35
    },
    STANDARD: {
      enterDuration: 550,
      exitDuration: 350,
      updateDuration: 300,
      enterEase: 'outBack',
      exitEase: 'inCubic',
      updateEase: 'outCubic',
      distance: 40,
      scaleFrom: 0.95,
      stagger: 60
    },
    HERO: {
      enterDuration: 750,
      exitDuration: 450,
      updateDuration: 400,
      enterEase: 'outExpo',
      exitEase: 'inExpo',
      updateEase: 'outBack',
      distance: 60,
      scaleFrom: 0.90,
      stagger: 80
    }
  });

  // Active animation tracker for conflict resolution & clean cancellation
  const activeAnimationMap = new WeakMap();

  /**
   * Cancels any in-flight animation for target elements
   */
  function cancelTargetAnimation(targets) {
    if (!targets) return;
    const elements = Array.isArray(targets) || targets instanceof NodeList ? Array.from(targets) : [targets];

    elements.forEach(el => {
      if (el && typeof el === 'object') {
        const activeAnim = activeAnimationMap.get(el);
        if (activeAnim && typeof activeAnim.cancel === 'function') {
          activeAnim.cancel();
        }
        if (remove) {
          remove(el);
        }
        activeAnimationMap.delete(el);
      }
    });
  }

  /**
   * Reveal / Enter animation for broadcast elements
   */
  function animateEnter(targets, options = {}) {
    if (!targets) return null;
    const reduced = prefersReducedMotion();
    const preset = Presets[options.preset] || Presets.SUBTLE;
    const duration = reduced ? 150 : (options.duration || preset.enterDuration);
    const distance = reduced ? 0 : (options.distance !== undefined ? options.distance : preset.distance);
    const direction = options.direction || 'up'; // 'up' | 'down' | 'left' | 'right'

    cancelTargetAnimation(targets);

    let startX = 0, startY = 0;
    if (direction === 'up') startY = distance;
    else if (direction === 'down') startY = -distance;
    else if (direction === 'left') startX = distance;
    else if (direction === 'right') startX = -distance;

    if (!animate) {
      // Fallback if Anime.js not loaded
      const els = Array.isArray(targets) ? targets : [targets];
      els.forEach(el => {
        if (el?.style) {
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
      });
      return null;
    }

    const anim = animate(targets, {
      opacity: [0, 1],
      translateX: [startX, 0],
      translateY: [startY, 0],
      scale: reduced ? [1, 1] : [preset.scaleFrom, 1],
      duration: duration,
      ease: preset.enterEase,
      delay: options.delay || (stagger && options.stagger ? stagger(preset.stagger) : 0),
      onBegin: options.onBegin,
      onComplete: () => {
        if (typeof options.onComplete === 'function') options.onComplete();
      }
    });

    const els = Array.isArray(targets) || targets instanceof NodeList ? Array.from(targets) : [targets];
    els.forEach(el => {
      if (el && typeof el === 'object') activeAnimationMap.set(el, anim);
    });

    return anim;
  }

  /**
   * Exit / Hide animation for broadcast elements
   */
  function animateExit(targets, options = {}) {
    if (!targets) return null;
    const reduced = prefersReducedMotion();
    const preset = Presets[options.preset] || Presets.SUBTLE;
    const duration = reduced ? 120 : (options.duration || preset.exitDuration);
    const distance = reduced ? 0 : (options.distance !== undefined ? options.distance : (preset.distance * 0.75));
    const direction = options.direction || 'up';

    cancelTargetAnimation(targets);

    let endX = 0, endY = 0;
    if (direction === 'up') endY = -distance;
    else if (direction === 'down') endY = distance;
    else if (direction === 'left') endX = -distance;
    else if (direction === 'right') endX = distance;

    if (!animate) {
      const els = Array.isArray(targets) ? targets : [targets];
      els.forEach(el => {
        if (el?.style) {
          el.style.opacity = '0';
        }
      });
      if (options.onComplete) options.onComplete();
      return null;
    }

    const anim = animate(targets, {
      opacity: [1, 0],
      translateX: [0, endX],
      translateY: [0, endY],
      duration: duration,
      ease: preset.exitEase,
      delay: options.delay || 0,
      onComplete: () => {
        const els = Array.isArray(targets) || targets instanceof NodeList ? Array.from(targets) : [targets];
        els.forEach(el => {
          if (el && typeof el === 'object') activeAnimationMap.delete(el);
        });
        if (typeof options.onComplete === 'function') options.onComplete();
      }
    });

    return anim;
  }

  /**
   * Point / Number Value Flip Animation (Subtle & fast for live scoring)
   */
  function animateValueUpdate(target, newValue, options = {}) {
    if (!target) return;
    const reduced = prefersReducedMotion();
    const preset = Presets.SUBTLE;
    const duration = reduced ? 100 : (options.duration || preset.updateDuration);

    cancelTargetAnimation(target);

    if (reduced || !animate) {
      target.textContent = newValue;
      return;
    }

    // Spring flip motion: scale punch + translateY
    const anim = animate(target, {
      scale: [1, 1.25, 1],
      translateY: [-4, 0],
      color: [options.highlightColor || '#f0d98a', '#ffffff'],
      duration: duration,
      ease: 'outBack',
      onBegin: () => {
        target.textContent = newValue;
      },
      onComplete: () => {
        target.style.transform = '';
        target.style.color = '';
        activeAnimationMap.delete(target);
      }
    });

    activeAnimationMap.set(target, anim);
  }

  /**
   * Serve Pulse Rhythm Animation
   */
  function animateServePulse(target) {
    if (!target) return null;
    cancelTargetAnimation(target);

    if (prefersReducedMotion() || !animate) {
      target.style.opacity = '1';
      return null;
    }

    const anim = animate(target, {
      scale: [0.92, 1.08, 0.92],
      opacity: [0.85, 1, 0.85],
      duration: 1200,
      ease: 'inOutQuad',
      loop: true
    });

    activeAnimationMap.set(target, anim);
    return anim;
  }

  return {
    Presets,
    prefersReducedMotion,
    cancelTargetAnimation,
    animateEnter,
    animateExit,
    animateValueUpdate,
    animateServePulse
  };
}));
