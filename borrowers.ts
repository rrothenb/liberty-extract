import {test, Page} from '@playwright/test';

let borrowerNumber = 0

async function nextBorrower (page: Page) {
  await page.getByTitle(`Item ${++borrowerNumber}`).click();
}

test('Fetch Borrowers', async ({page}) => {
  try {
    await page.goto(`http://${process.env.HOST}/liberty/libraryHome.do`);
    await page.getByRole('button', {name: 'Login'}).click();
    await page.getByRole('textbox', {name: 'Username:'}).click();
    await page.getByRole('textbox', {name: 'Username:'}).fill(process.env.USERNAME);
    await page.getByRole('textbox', {name: 'Password:'}).click();
    await page.getByRole('textbox', {name: 'Password:'}).fill(process.env.PASSWORD);
    await page.getByRole('button', {name: 'Login'}).click();
    await page.goto(`http://${process.env.HOST}/liberty/circulation/borrowers/browse.do`)
    const navMsg = await page.locator('#navigation_message a').allInnerTexts()
    console.log(navMsg)
    borrowerNumber = 1
    await page.getByRole('link', {name: `${borrowerNumber}`, exact: true}).click();
    for (let i=0;i<5;i++) {
      // Print text from specific elements (e.g., all table cells)
      const cells = await page.locator('tr').allInnerTexts();
      console.log(cells
        .filter(cell => cell.includes(':'))
        .map(cell => cell.split(':\t').map(part => part.trim()))
        .filter(row => row[1].length > 1));
      await nextBorrower(page)
    }
  } finally {
    await page.getByRole('button', {name: 'Logout'}).click();
  }
});
