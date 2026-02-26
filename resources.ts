import {test, Page} from '@playwright/test'
import ObjectsToCsv from 'objects-to-csv'

let resourceNumber = 0

async function nextResource (page: Page) {
  const nextButton = page.getByTitle(`Item ${(++resourceNumber).toLocaleString()}`)
  if (await nextButton.isEnabled()) {
    await nextButton.click()
  }
}

test('Fetch Resources', async ({page}) => {
  try {
    await page.goto(`http://${process.env.HOST}/liberty/libraryHome.do`)
    await page.getByRole('button', {name: 'Login'}).click()
    await page.getByRole('textbox', {name: 'Username:'}).click()
    await page.getByRole('textbox', {name: 'Username:'}).fill(process.env.USERNAME!)
    await page.getByRole('textbox', {name: 'Password:'}).click()
    await page.getByRole('textbox', {name: 'Password:'}).fill(process.env.PASSWORD!)
    await page.getByRole('button', {name: 'Login'}).click()
    await page.goto(`http://${process.env.HOST}/liberty/cataloguing/biblios/browse.do`)
    await page.locator('#navigation_message a').click()
    const navMsg = await page.locator('#navigation_message').allInnerTexts()
    const numResources = Number(navMsg[0].split(' ')[2])
    console.log(numResources)
    resourceNumber = 1
    await page.getByRole('link', {name: `${resourceNumber}`, exact: true}).click()
    const resources = []
    for (let i=0;i<numResources;i++) {
      if (resourceNumber % 100 == 0) {
        console.log(`Processing resource ${resourceNumber}`)
      }
      // Print text from specific elements (e.g., all table cells)
      const cells = await page.locator('tr').allInnerTexts()
      resources.push(cells
        .filter(cell => cell.includes(':') || cell.match(/^[0-9]+\n/))
        .map(cell => cell.split(/:\t|\n/).map(part => part.trim()))
        .filter(row => row[1].length > 1)
        .reduce((acc, row) => {
          acc[row[0]] = row[1]
          return acc
        }, {} as Record<string, string>))
      await nextResource(page)
    }
    console.log(`Writing ${resources.length} resources to CSV`)
    const csv = new ObjectsToCsv(resources.map(cell => ({
      id: cell.ID,
      title: cell.Title,
      author: cell.Author,
      type: cell.GMD,
      isbn: cell.ISBN,
      notes: cell.Notes,
      genres: cell.Genres,
      date: cell.Date,
      abstract: cell.Abstract,
      subjects: cell.Subjects,
      description: cell.Description,
      publisher: cell.Publisher,
      place: cell.Place,
      classification: cell.Classification,
      barcode:
        cell['1'] &&
        cell['1'].split('\t') &&
        cell['1'].split('\t').length > 0 &&
        cell['1'].split('\t')[0] ? cell['1'].split('\t')[0] : null,
    })))
    await csv.toDisk('resources.csv')
  } finally {
    await page.getByRole('button', {name: 'Logout'}).click()
  }
})
