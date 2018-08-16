import React, { HTMLAttributes } from 'react'

export function createComponent<T = HTMLAttributes<HTMLDivElement>>(
  cls: string,
  elm: string = 'div',
) {
  return function(props: T) {
    const { className, ...other } = props as any
    return React.createElement(elm, {
      className: `${cls} ${className || ''}`,
      ...other,
    })
  }
}