import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {
  getFieldName,
  isStatic,
  shouldRunInnerScripts
} from './processing/utils';


class RawHtmlFieldInput extends React.Component {
  static propTypes = {
    fieldId: PropTypes.string.isRequired,
    blockDefinition: PropTypes.object.isRequired,
    blockId: PropTypes.string.isRequired,
    html: PropTypes.string.isRequired,
    value: PropTypes.any,
    changeBlockValue: PropTypes.func.isRequired,
  };

  runInnerScripts() {
    if (shouldRunInnerScripts(this.props.blockDefinition)) {
      for (let script
           of ReactDOM.findDOMNode(this).querySelectorAll('script')) {
        script.parentNode.removeChild(script);
        window.eval(script.innerHTML);
      }
    }
  }

  setValue(input) {
    const {value} = this.props;
    if ((value !== undefined) && (value !== null)) {
      if (input.type === 'file') {
        input.files = value;
      } else if ((input.type === 'checkbox') || (input.type === 'radio')) {
        input.checked = value === null ? false : (
          typeof value === 'boolean' ? value : value.includes(input.value));
      } else if (input.type === 'hidden') {
        input.value = value;
        input.dispatchEvent(new Event('change'));
      } else {
        input.value = value;
      }
    }
  }

  bindChange(input) {
    if (input.type === 'hidden') {
      const observer = new MutationObserver(() => {
        input.dispatchEvent(new Event('change'));
      });
      observer.observe(input, {
        attributes: true, attributeFilter: ['value'],
      });
      this.mutationObservers.push(observer);
    }
    input.addEventListener('change', this.onChange);
  }

  unbindChange(input) {
    input.removeEventListener('change', this.onChange);
  }

  componentDidMount() {
    const {blockDefinition, blockId} = this.props;
    if (!isStatic(blockDefinition)) {
      const name = getFieldName(blockId);
      this.inputs = [
        ...ReactDOM.findDOMNode(this).querySelectorAll(`[name="${name}"]`)];
      if (this.inputs.length === 0) {
        throw Error(`Could not find input with name "${name}"`);
      }
      this.mutationObservers = [];
      for (let input of this.inputs) {
        this.setValue(input);
        this.bindChange(input);
        // We remove the name attribute to remove inputs from the submitted form.
        input.removeAttribute('name');
      }
    }
    this.runInnerScripts();
  }

  componentWillUnmount() {
    if (!isStatic(this.props.blockDefinition)) {
      for (let observer of this.mutationObservers) {
        observer.disconnect();
      }
      for (let input of this.inputs) {
        this.unbindChange(input);
      }
    }
  }

  onChange = event => {
    const input = event.target;
    let value;
    if (input.type === 'file') {
      value = input.files;
    } else if (input.type === 'checkbox' || input.type === 'radio') {
      const boxes = this.inputs;
      value = boxes.filter(box => box.checked).map(box => box.value);
      const previousValue = this.props.value;
      if (input.type === 'radio') {
        if (previousValue) {
          // Makes it possible to select only one radio button at a time.
          boxes.filter(box => box.value === previousValue)[0].checked = false;
          const index = value.indexOf(previousValue);
          if (index > -1) {
            value.splice(index, 1);
          }
        }
        value = value.length > 0 ? value[0] : null;
      }
    } else if (input.tagName === 'SELECT') {
      value = input.options[input.selectedIndex].value;
    } else {
      value = input.value;
    }
    this.props.changeBlockValue(value);
  };

  get html() {
    const {blockDefinition, html, blockId} = this.props;
    if (isStatic(blockDefinition)) {
      return html;
    }
    return html.replace(/__ID__/g, blockId);
  }

  render() {
    return (
      <div dangerouslySetInnerHTML={{__html: this.html}} />
    );
  }
}


export default RawHtmlFieldInput;
