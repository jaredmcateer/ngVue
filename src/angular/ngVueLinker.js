import angular from 'angular'
import Vue from 'vue'
import { createApp } from '@vue/composition-api'
import getVueComponent from '../components/getVueComponent'
import getPropExprs from '../components/props/getExpressions'
import watchPropExprs from '../components/props/watchExpressions'
import evalValues from '../components/props/evaluateValues'
import evalPropEvents from '../components/props/evaluateEvents'
import evaluateDirectives from '../directives/evaluateDirectives'
import extractSpecialAttributes from '../components/props/extractSpecialAttributes'
import watchSpecialAttributes from '../components/props/watchSpecialAttributes'
import { isCompositionApi } from '../../lib/isCompositionApi'

export function ngVueLinker(componentName, jqElement, elAttributes, scope, $injector) {
  if (!jqElement.parent().length) throw new Error('ngVue components must have a parent tag or they will not render')

  const $ngVue = $injector.has('$ngVue') ? $injector.get('$ngVue') : null

  const dataExprsMap = getPropExprs(elAttributes)
  const Component = getVueComponent(componentName, $injector)
  const directives = evaluateDirectives(elAttributes, scope) || []
  const reactiveData = {
    _v: {
      props: evalValues(dataExprsMap.props || dataExprsMap.data, scope) || {},
      attrs: evalValues(dataExprsMap.htmlAttributes, scope) || {},
      special: extractSpecialAttributes(elAttributes),
    },
  }
  const on = evalPropEvents(dataExprsMap, scope) || {}

  const inQuirkMode = $ngVue ? $ngVue.inQuirkMode() : false
  const rootProps = $ngVue ? $ngVue.getRootProps() : {}

  const mounted = rootProps.mounted
  const props = Object.assign({}, rootProps)
  props.mounted = function () {
    const element = jqElement[0]
    if (element.innerHTML.trim()) {
      let html
      if (element.children.length === 0) {
        const span = document.createElement('span')
        span.innerHTML = element.innerHTML.trim()
        html = span
      } else {
        html = element.children[0]
      }
      const slot = this.$refs.__slot__
      slot.parentNode.replaceChild(html, slot)
    }
    if (angular.isFunction(mounted)) {
      mounted.apply(this, arguments)
    }
  }

  const watchOptions = {
    depth: elAttributes.watchDepth,
    quirk: inQuirkMode,
  }
  watchPropExprs(dataExprsMap, reactiveData, watchOptions, scope, 'props')
  watchPropExprs(dataExprsMap, reactiveData, watchOptions, scope, 'attrs')
  watchSpecialAttributes(reactiveData, jqElement, scope)

  const render = (h) => {
    return (
      <Component
        {...{ directives }}
        {...{ props: reactiveData._v.props, on, attrs: reactiveData._v.attrs }}
        {...reactiveData._v.special}
      >
        {<span ref="__slot__" />}
      </Component>
    )
  }
  let vueInstance
  if (isCompositionApi(Component)) {
    vueInstance = createApp({
      name: `NgVue-CompositionApi-${Component.name}`,
      data() {
        return reactiveData
      },
      render,
      ...props,
    })

    vueInstance.mount(jqElement[0])
  } else {
    vueInstance = new Vue({
      name: `NgVue-OptionsApi-${Component.name}`,
      el: jqElement[0],
      data: reactiveData,
      render,
      ...props,
    })
  }

  scope.$on('$destroy', () => {
    if (isCompositionApi(Component)) {
      vueInstance.unmount()
    } else {
      vueInstance.$destroy()
    }
    angular.element(vueInstance.$el).remove()
    vueInstance = null
  })
}
