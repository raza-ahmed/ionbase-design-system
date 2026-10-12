/**
 * Which children Menu, TagGroup, Tabs and SplitButton accept, checked by
 * `tsc` rather than run: this file renders nothing and no story imports it.
 *
 * All four are react-stately collections, and their children are typed
 * `CollectionChildren`: one collection element, an array of them, or a render
 * function. The demo eval (12 Oct 2026) found contracts-only generations
 * writing `const rows: React.ReactElement[] = []` and pushing rows into it, on
 * 2 of 3 Agents screens. That compiles nowhere: `ReactElement` defaults its
 * props to `unknown`, which is not an item's props. The contracts now name the
 * forms below, and this file holds them to it in both directions. A form that
 * works stays working, and a `@ts-expect-error` whose form starts compiling is
 * itself an error, so the contracts get updated.
 */
import * as React from 'react';
import {
  Menu,
  MenuItem,
  MenuSection,
  SplitButton,
  Tabs,
  Tag,
  TagGroup,
} from 'ionbase-ui';

declare const paused: boolean;
declare const filters: { id: string; label: string }[];

/* ------------------------------------------------------------- these compile */

export const writtenOut = (
  <Menu aria-label="Agent actions">
    <MenuItem key="pause">Pause</MenuItem>
    <MenuItem key="delete">Delete</MenuItem>
  </Menu>
);

export const ternaryAndNull = (
  <Menu aria-label="Agent actions">
    {paused ? (
      <MenuItem key="resume">Resume</MenuItem>
    ) : (
      <MenuItem key="pause">Pause</MenuItem>
    )}
    {paused ? <MenuItem key="archive">Archive</MenuItem> : null}
    <MenuItem key="delete">Delete</MenuItem>
  </Menu>
);

export const itemsAndRenderFunction = (
  <TagGroup label="Active filters" items={filters}>
    {(f) => <Tag key={f.id}>{f.label}</Tag>}
  </TagGroup>
);

export const mapAsTheOnlyChild = (
  <TagGroup label="Active filters">
    {filters.map((f) => (
      <Tag key={f.id}>{f.label}</Tag>
    ))}
  </TagGroup>
);

export const mapInsideASection = (
  <Menu aria-label="Filters">
    <MenuSection title="Applied">
      {filters.map((f) => (
        <MenuItem key={f.id}>{f.label}</MenuItem>
      ))}
    </MenuSection>
  </Menu>
);

const jsxRows: React.JSX.Element[] = [];
jsxRows.push(<MenuItem key="delete">Delete</MenuItem>);
export const arrayOfJsxElements = (
  <Menu aria-label="Agent actions">{jsxRows}</Menu>
);

/* ------------------------------------------------------- these do not compile */

const reactElements: React.ReactElement[] = [
  <MenuItem key="delete">Delete</MenuItem>,
];

export const reactElementArray = (
  // @ts-expect-error ReactElement's props are `unknown`, not an item's props
  <Menu aria-label="Agent actions">{reactElements}</Menu>
);

export const reactElementArrayInTags = (
  // @ts-expect-error the same in a TagGroup
  <TagGroup label="Active filters">{reactElements}</TagGroup>
);

export const reactElementArrayInTabs = (
  // @ts-expect-error the same in Tabs
  <Tabs aria-label="Account">{reactElements}</Tabs>
);

export const reactElementArrayInSplitButton =
  // prettier-ignore
  // @ts-expect-error the same in a SplitButton
  <SplitButton label="Save" onPress={() => {}}>{reactElements}</SplitButton>;

export const andAnd =
  // prettier-ignore
  // @ts-expect-error `false` is not a collection element: write `cond ? <MenuItem /> : null`
  <Menu aria-label="Agent actions"><MenuItem key="delete">Delete</MenuItem>{paused && <MenuItem key="archive">Archive</MenuItem>}</Menu>;

export const rowsBesideAMap =
  // prettier-ignore
  // @ts-expect-error an array beside written-out rows: put the mapped rows in a MenuSection
  <Menu aria-label="Filters"><MenuItem key="all">All</MenuItem>{filters.map((f) => <MenuItem key={f.id}>{f.label}</MenuItem>)}</Menu>;
