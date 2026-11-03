const test = require('node:test');
const assert = require('node:assert/strict');

test('Monitor Math and Status Logic Tests', async (t) => {
  await t.test('Computes uptime percentage accurately', () => {
    const calculateUptime = (total, successful) => {
      if (total === 0) return 100.00;
      return parseFloat(((successful / total) * 100).toFixed(2));
    };

    assert.strictEqual(calculateUptime(100, 100), 100.00);
    assert.strictEqual(calculateUptime(100, 99), 99.00);
    assert.strictEqual(calculateUptime(240, 238), 99.17);
    assert.strictEqual(calculateUptime(0, 0), 100.00);
    assert.strictEqual(calculateUptime(10, 0), 0.00);
  });

  await t.test('Determines system health categorization for status pages', () => {
    const getSystemStatus = (monitors) => {
      if (!monitors || monitors.length === 0) return 'operational';
      const downCount = monitors.filter(m => m.status === 'down').length;
      if (downCount === 0) return 'operational';
      if (downCount === monitors.length || downCount > monitors.length / 2) return 'major_outage';
      return 'partial_outage';
    };

    assert.strictEqual(getSystemStatus([{ status: 'up' }, { status: 'up' }]), 'operational');
    assert.strictEqual(getSystemStatus([{ status: 'up' }, { status: 'down' }, { status: 'up' }]), 'partial_outage');
    assert.strictEqual(getSystemStatus([{ status: 'down' }, { status: 'down' }, { status: 'up' }]), 'major_outage');
    assert.strictEqual(getSystemStatus([]), 'operational');
  });

  await t.test('Verifies interval check calculation', () => {
    const isDue = (lastCheckedTimestamp, intervalMinutes, currentTimestamp) => {
      if (!lastCheckedTimestamp) return true;
      const diffMs = currentTimestamp - lastCheckedTimestamp;
      const diffMinutes = diffMs / (1000 * 60);
      return diffMinutes >= intervalMinutes;
    };

    const now = 1700000000000;
    // Checked 2 minutes ago with 1-minute interval -> should be due
    assert.strictEqual(isDue(now - 120000, 1, now), true);
    // Checked 30 seconds ago with 1-minute interval -> not due
    assert.strictEqual(isDue(now - 30000, 1, now), false);
    // Never checked -> should be due
    assert.strictEqual(isDue(null, 5, now), true);
  });
});
