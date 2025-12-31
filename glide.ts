// Config docs:
//
//   https://glide-browser.app/config
//
// API reference:
//
//   https://glide-browser.app/api
//
// Default config files can be found here:
//
//   https://github.com/glide-browser/glide/tree/main/src/glide/browser/base/content/plugins
//
// Most default keymappings are defined here:
//
//   https://github.com/glide-browser/glide/blob/main/src/glide/browser/base/content/plugins/keymaps.mts
//
// Try typing `glide.` and see what you can do!

glide.o.hint_size = `1rem`

glide.prefs.set(`sidebar.revamp`, false)
glide.prefs.set(`browser.startup.homepage`, `https://google.com`)

// `e` is used for archiving emails in Gmail.
glide.autocmds.create(`UrlEnter`, { hostname: `mail.google.com` }, () => {
  glide.buf.keymaps.del(`normal`, `e`)
})

glide.env.set(
  `PATH`,
  `/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/opt/local/bin:/opt/homebrew/bin:/opt/homebrew/sbin`,
)

void glide.search_engines.add({
  name: `Discogs`,
  keyword: `disc`,
  search_url: `https://www.discogs.com/search/?q={searchTerms}`,
  favicon_url: `https://www.discogs.com/favicon.ico`,
})

glide.excmds.create(
  {
    name: `pass`,
    description: `Fill a username and password for the current website`,
  },
  async ({ tab_id }) => {
    const { hostname } = glide.ctx.url
    const names: string[] = []

    const paths = (
      await Array.fromAsync(
        (await glide.process.execute(`pass`, [`git`, `ls-files`])).stdout,
      )
    ).join(``)
    for (const path of paths.split(`\n`)) {
      const segments = path.split(`/`)
      if (segments.length !== 2) {
        continue
      }

      const directory = segments[0]!
      if (hostname !== directory && !hostname.endsWith(`.${directory}`)) {
        continue
      }

      const name = path.slice(0, -`.gpg`.length)
      names.push(name)
    }

    const fill = async (name: string) => {
      const username = name.split(`/`).at(-1)!
      const password = (
        await Array.fromAsync(
          (await glide.process.execute(`pass`, [name])).stdout,
        )
      )
        .join(``)
        .split(`\n`)[0]!
      await glide.content.execute(
        (username, password) => {
          const usernameInputs = document.querySelectorAll<HTMLInputElement>(
            `input[type="email"], input[type="text"][autocomplete="username"], input[name*="user" i], input[name*="email" i], input[id*="user" i], input[id*="email" i], input[placeholder*="email" i], input[placeholder*="user" i]`,
          )
          const passwordInputs = document.querySelectorAll<HTMLInputElement>(
            `input[type="password"], input[autocomplete="current-password"], input[autocomplete="new-password"]`,
          )
          if (usernameInputs.length === 0 && passwordInputs.length === 0) {
            throw new Error(`No username or password inputs to fill`)
          }

          for (const input of usernameInputs) {
            input.focus()
            input.value = username
            input.dispatchEvent(new Event(`input`, { bubbles: true }))
          }
          for (const input of passwordInputs) {
            input.focus()
            input.value = password
            input.dispatchEvent(new Event(`input`, { bubbles: true }))
          }
        },
        { tab_id, args: [username, password] },
      )
    }

    switch (names.length) {
      case 0:
        throw new Error(`${hostname} doesn't have any passwords`)
      case 1:
        await fill(names[0]!)
        break
      default:
        setTimeout(() =>
          glide.commandline.show({
            title: `Passwords`,
            options: names.map(name => ({
              label: name,
              execute: () => fill(name),
            })),
          }),
        )
        break
    }
  },
)
