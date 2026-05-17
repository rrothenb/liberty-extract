import {test, Page} from '@playwright/test'
import ObjectsToCsv from 'objects-to-csv'

let resourceNumber = 0

async function nextResource (page: Page) {
  const nextButton = page.getByTitle(`Item ${(++resourceNumber).toLocaleString()}`)
  if (await nextButton.isEnabled()) {
    await nextButton.click()
  }
}

function getBarcodes(resource: any): string[] {
  const barcodes: string[] = []
  let index = 1
  while (resource[`${index}`]) {
    const value = resource[`${index}`]
    barcodes.push(value.split('\t') &&
      value.split('\t').length > 0 &&
      value.split('\t')[0] ? value.split('\t')[0] : null,
    )
    index++
  }
  return barcodes
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
    // first get box set relations
    await page.goto(`http://${process.env.HOST}/liberty/cataloguing/biblios/resourceBoxes/browseSearchRoute.do?_open=1`)
    await page.locator('#issueSearchForm_queryTerm').press('Enter')
    await page.locator('#navigation_message a').click()
    let navMsg = await page.locator('#navigation_message').allInnerTexts()
    let numBoxsets = Number(navMsg[0].split(' ')[2])
    console.log(numBoxsets)
    let allItemUrls: string[] = []
    while (numBoxsets > 0) {
      const itemUrls = await page
        .locator('tr:nth-child(even) td:first-child a')
        .evaluateAll(els => (els as HTMLAnchorElement[]).map(e => e.href))
      allItemUrls = allItemUrls.concat(itemUrls)
      numBoxsets -= 20
      if (numBoxsets > 0) {
        await page.locator('#navigation_next').click()
      }
    }
    console.log(allItemUrls.length)
    const boxsetMap: Record<string, string> = {}
    for (const itemUrl of allItemUrls) {
      await page.goto(itemUrl)
      const boxBarcode = (await page.locator('th:text-is("Barcode:") + td a').allInnerTexts())[0]
      for (const itemBarcode of await page.locator('td[data-property=barcode]').allInnerTexts()) {
        boxsetMap[itemBarcode] = boxBarcode
      }
    }
    // Now get resources
    await page.goto(`http://${process.env.HOST}/liberty/cataloguing/biblios/browse.do`)
    await page.locator('#navigation_message a').click()
    navMsg = await page.locator('#navigation_message').allInnerTexts()
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
      classification: cell.Classification,
      barcodes: getBarcodes(cell).join('|'),
      resourceBox: getBarcodes(cell).reduce((previousValue, currentValue) => ({...previousValue, [currentValue]: boxsetMap[currentValue]}),{})
    })).filter(resource => resource.barcodes.length != 0))
    await csv.toDisk('resources.csv')
  } finally {
    await page.getByRole('button', {name: 'Logout'}).click()
  }
})
