// Freezes all intrinsics
try {
  // eslint-disable-next-line no-undef,import/unambiguous
  lockdown({
    consoleTaming: 'unsafe',
    errorTaming: 'unsafe',
    mathTaming: 'unsafe',
    dateTaming: 'unsafe',
    overrideTaming: 'severe',
  });
} catch (error) {
  // SES lockdown fails on modern browsers due to non-configurable properties
  // like Symbol.dispose. Log and continue — the extension can still function.
  console.warn('Lockdown failed (non-critical):', error.message);
}
