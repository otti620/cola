const fs = require('fs');

function replaceFile(path, pairs) {
  if (fs.existsSync(path)) {
    let text = fs.readFileSync(path, 'utf8');
    pairs.forEach(p => {
      text = text.replace(p[0], p[1]);
    });
    fs.writeFileSync(path, text);
  }
}

replaceFile('src/components/AdminPanel.tsx', [
  [/daily task values/g, 'daily profit values'],
  [/daily task, user balance/g, 'daily profit, user balance'],
  [/Tasks Count/g, 'Profit Count'],
  [/Daily Tasks Count/g, 'Daily Profit Count'],
  [/Daily Task Reward/g, 'Daily Profit Reward'],
  [/DAILY DISPATCH TASKS/g, 'DAILY PROFIT'],
  [/Daily Verification Tasks Config/g, 'Daily Verification Profit Config'],
  [/Reconfigure Task/g, 'Reconfigure Profit'],
  [/Task edit Modal/g, 'Profit edit Modal'],
  [/Configure Dispatch Task/g, 'Configure Dispatch Profit'],
  [/Task Key:/g, 'Profit Key:'],
  [/Task Title \/ Label/g, 'Profit Title / Label'],
  [/Save Task Settings/g, 'Save Profit Settings']
]);

replaceFile('src/components/HomeTab.tsx', [
  [/under the 'Task' tab/g, "under the 'Profit' tab"]
]);

replaceFile('src/components/MineTab.tsx', [
  [/inquiries regarding deposit credits, tasks, or instant/g, 'inquiries regarding deposit credits, profit, or instant'],
  [/1\. Driver Dispatch Tasks/g, '1. Driver Dispatch Profit'],
  [/daily task yield multipliers/g, 'daily profit yield multipliers'],
  [/team's task outputs/g, "team's profit outputs"],
  [/based on tasks/g, 'based on profit'],
  [/isTask = t.details\?\.includes\("Check"\)/g, 'isTask = t.details?.includes("Claim")'], // Adjust logic for the details
  [/Task Bonus/g, 'Profit Bonus'],
  [/Task route verification/g, 'Profit route verification']
]);

replaceFile('src/components/TeamTab.tsx', [
  [/complete tasks, get cash/g, 'claim profit, get cash']
]);

replaceFile('src/components/VipTab.tsx', [
  [/dailyTasksCount\} Clicks/g, 'dailyTasksCount} Claims'] // Or just change UI text?
]);

