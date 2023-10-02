import { Component, OnInit } from '@angular/core';

const USER_SELECTED_CLASSNAME = '--user-selected';

const ALGO_SELECTED_CLASSNAME = '--algo-selected';

const DASHED_CLASSNAME = '--dashed';

const DARK_CLASSNAME = '--dark';

const RESERVED_CLASSNAMES = [
  USER_SELECTED_CLASSNAME,
  ALGO_SELECTED_CLASSNAME,
  DASHED_CLASSNAME,
  DARK_CLASSNAME,
];

const CLICK_ACTION = 'click' as const;

const INPUT_ACTION = 'input' as const;

const KEY_IGNORE = 'inspector-ignore';

type SubAction = typeof CLICK_ACTION | typeof INPUT_ACTION;

@Component({
  selector: 'app-automator',
  templateUrl: './automator.component.html',
  styleUrls: ['./automator.component.css'],
})
export class AutomatorComponent implements OnInit {
  step: 1 | 2 | 3 = 1;

  subAction: SubAction | '' = '';

  inputValue = '';

  enableInspector = true;
  showOverlay = false;
  x = 0;
  y = 0;
  width = 0;
  height = 0;

  ngOnInit(): void {
    this.toggleInspector();
  }

  selectedElements: Element[] = [];

  selectedSubElements: Element[] = [];

  get isClickSubAction() {
    return this.subAction === CLICK_ACTION;
  }

  get isInputSubAction() {
    return this.subAction === INPUT_ACTION;
  }

  get predictedParentsCount() {
    return this.selectedElements.length - 2;
  }

  get elements() {
    return this.subAction ? this.selectedSubElements : this.selectedElements;
  }

  get sizeIndicatorStyle() {
    return {
      left: `${this.x}px`,
      top: `${this.y}px`,
      width: `${this.width}px`,
      height: `${this.height}px`,
    };
  }

  get selectedClasses() {
    return [...new Set(this.elements.map((e) => e.className.split(' ')).flat())]
      .filter((className) => !RESERVED_CLASSNAMES.includes(className))
      .filter((className) => {
        return this.elements.every((el) => {
          return el.className.includes(className);
        });
      });
  }

  get selectedTagNames() {
    return [...new Set(this.elements.map((e) => e.tagName))];
  }

  toggleInspector() {
    const listener = document.addEventListener;
    listener?.call(document.body, 'mousemove', (e) => this.updatePosition(e));
    listener?.call(document.body, 'click', (e) => this.handleClick(e), true);
  }

  handleClick(e: Event) {
    const targetNode = this.getTargetNode(e);
    if (!targetNode || !this.enableInspector) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.selectElement(e.target as Element);
  }

  getTargetNode(e: Event) {
    const path = e.composedPath() as HTMLElement[];
    if (!path) null;
    const isAutomationPanel = path.some((n) => n.hasAttribute?.(KEY_IGNORE));
    if (isAutomationPanel) return null;
    const [targetNode] = path;
    return targetNode;
  }

  updatePosition(e: Event) {
    const targetNode = this.getTargetNode(e);
    if (targetNode) {
      this.showOverlay = true;
      const rect = targetNode.getBoundingClientRect();
      this.x = rect.x;
      this.y = rect.y;
      this.width = rect.width;
      this.height = rect.height;
    } else {
      this.showOverlay = false;
    }
  }

  onChooseSubAction(subAction: SubAction) {
    this.subAction = subAction;
    this.step = 3;
    this.selectedElements.forEach((e) => e.classList.add(DASHED_CLASSNAME));
  }

  reset() {
    if (!this.subAction) {
      this.step = 1;
      this.selectedElements.forEach((el) => this.clearSelectedClasses(el));
      this.selectedElements = [];
    } else {
      this.step = 2;
      this.selectedSubElements.forEach((el) => this.clearSelectedClasses(el));
      this.selectedSubElements = [];
      this.subAction = '';
      this.inputValue = '';
    }
  }

  clearSelectedClasses(element: Element) {
    element.classList.remove(USER_SELECTED_CLASSNAME);
    element.classList.remove(ALGO_SELECTED_CLASSNAME);
    element.classList.remove(DASHED_CLASSNAME);
    element.classList.remove(DARK_CLASSNAME);
  }

  isSubElement(element: Element) {
    return this.selectedElements.some((el) => {
      return Array.from(el.childNodes).some((child) => child === element);
    });
  }

  selectElement(element: Element, userSelected = true) {
    if (this.step === 2) return; // disable selection in this step
    const index = this.elements.findIndex((el) => el === element);
    if (index !== -1) {
      this.elements.splice(index, 1);
      this.clearSelectedClasses(element);
      return; // deselect an element if was already selected
    }
    const selectedSubElements = this.elements.filter((el) => {
      return Array.from(element.childNodes).some((child) => child === el);
    });
    selectedSubElements.forEach((el) => {
      this.clearSelectedClasses(el);
      const index = this.elements.findIndex((e) => e === el);
      // deselect child element if parent is selected
      if (index !== -1) this.elements.splice(index, 1);
    });

    // select element
    this.elements.push(element);

    // add classnames for styling
    if (userSelected) element.classList.add(USER_SELECTED_CLASSNAME);
    else element.classList.add(ALGO_SELECTED_CLASSNAME);
    if (this.subAction) element.classList.add(DARK_CLASSNAME);

    const shouldPredict =
      (this.subAction && this.elements.length) || this.elements.length > 1;
    if (shouldPredict && userSelected) this.predictSimilar();
  }

  predictByClassName() {
    if (!this.selectedClasses.length) return [];
    const similar = document.body.querySelectorAll(
      this.selectedClasses.map((c) => `.${c}`).join('')
    );
    if (similar.length <= this.elements.length) return [];
    return Array.from(similar)
      .map((el) => {
        if (this.elements.find((e) => e === el)) return;
        if (this.subAction && !this.isSubElement(el)) return;
        return el;
      })
      .filter(Boolean) as Element[];
  }

  predictByTagName() {
    if (this.selectedTagNames.length !== 1) return [];
    const similar = document.body.getElementsByTagName(
      this.selectedTagNames[0]
    );
    if (similar.length <= this.elements.length) return [];
    return Array.from(similar)
      .map((el) => {
        if (this.elements.find((e) => e === el)) return;
        if (this.subAction && !this.isSubElement(el)) return;
        return el;
      })
      .filter(Boolean) as Element[];
  }

  predictSimilar() {
    const predictedByClassName = this.predictByClassName();
    if (predictedByClassName.length) {
      predictedByClassName.forEach((el) => this.selectElement(el, false));
      return;
    }
    const predictByTagName = this.predictByTagName();
    if (predictByTagName.length) {
      predictByTagName.forEach((el) => this.selectElement(el, false));
      return;
    }
    // todo: add complex searches
  }

  async runBot() {
    this.enableInspector = false;
    await Promise.all(
      this.selectedSubElements.map((el) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            if (this.subAction === 'click') (el as HTMLButtonElement).click();
            if (this.subAction === 'input')
              (el as HTMLInputElement).value = this.inputValue;
            resolve(null);
          }, 100);
        });
      })
    );
    this.enableInspector = true;
  }
}
