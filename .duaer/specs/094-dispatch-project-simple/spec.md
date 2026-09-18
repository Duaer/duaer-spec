# Feature Specification: Simplify dispatch when project already set

**Feature Branch**: `feat/dispatch-project-simple`  
**Brief**: `.duaer/specs/094-dispatch-project-simple/`  
**Status**: Accepted

## Goal

After the current project is chosen (Projects drawer), the dispatch panel must
not re-ask for a product repo. Show a short project summary only; keep deploy
target + agent + launch.

## Acceptance

1. With active project: hide browse/scan/filter/list/path; show「当前项目：名称」+ path
2. Title reads「启动数字员工」/ Launch digital employee (not「派工到当前项目」)
3. `npm test` + `npm run test:live` pass
