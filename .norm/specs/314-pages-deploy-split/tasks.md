# Tasks — 314-pages-deploy-split

- [x] Split `.github/workflows/pages.yml` into build + deploy
- [x] Split `.norm/templates/deploy-github-pages.yml` the same way
- [x] Both files parse; deploy `needs: build`
- [x] `npm test` passes
- [x] Ponytail review Ship, merge to `develop`
- [ ] Promote to `main`; push-triggered Pages run succeeds; live site has no `duaer`
