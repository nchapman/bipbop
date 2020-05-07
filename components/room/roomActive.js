import Head from 'next/head'
import React from 'react'
import TextChat from '../textChat/textChat'
import VideoChat from '../videoChat/videoChat'
import debounce from 'lodash/debounce'
import { eventPath } from '../../lib/utils'
import throttle from 'lodash/throttle'

export default class RoomActive extends React.Component {
  static HIDE_CONTROLS_DELAY = 3500
  static MOUSE_EVENT_DELAY = 150

  constructor (props) {
    super(props)

    this.handleToggleChat = this.handleToggleChat.bind(this)
    this.handleMouseMoveThrottled = throttle(this.handleMouseMove.bind(this), RoomActive.MOUSE_EVENT_DELAY)
    this.handleMouseOutDebounced = debounce(this.handleMouseOut.bind(this), RoomActive.MOUSE_EVENT_DELAY)
    this.handleClickDebounced = debounce(this.handleClick.bind(this), RoomActive.MOUSE_EVENT_DELAY)
    this.handleDoubleClick = this.handleDoubleClick.bind(this)
    this.hideControls = this.hideControls.bind(this)

    window.addEventListener('mousemove', this.handleMouseMoveThrottled)
    window.addEventListener('mouseout', this.handleMouseOutDebounced)
    window.addEventListener('click', this.handleClickDebounced)
    window.addEventListener('dblclick', this.handleDoubleClick)

    this.state = {
      showChat: false,
      showControls: true,
      isFullscreen: false
    }
  }

  handleToggleChat () {
    this.setState({ showChat: !this.state.showChat })
  }

  startAutoHideControlsTimer (delay = RoomActive.HIDE_CONTROLS_DELAY) {
    this.clearAutoHideControlsTimer()
    this.hideControlsTimer = setTimeout(this.hideControls, delay)
  }

  clearAutoHideControlsTimer () {
    clearTimeout(this.hideControlsTimer)
  }

  hideControls () {
    this.setState({ showControls: false })
  }

  showControls () {
    this.setState({ showControls: true })
  }

  handleMouseMove (event) {
    this.startAutoHideControlsTimer()

    if (!this.state.showControls) {
      this.showControls()
    }
  }

  handleMouseOut (event) {
    if (!event.relatedTarget) {
      this.startAutoHideControlsTimer(0)
    }
  }

  handleClick (event) {
    if (!this.hasClickableElements(event)) {
      this.startAutoHideControlsTimer(0)
    }
  }

  handleDoubleClick (event) {
    if (!this.hasClickableElements(event)) {
      // Invert fullscreen
      const newIsFullscreen = !this.state.isFullscreen

      if (newIsFullscreen) {
        document.documentElement.requestFullscreen()
          .then(()=> {
            this.setState({ isFullscreen: newIsFullscreen })
          })
          .catch(e => console.error(e))
      } else {
        document.exitFullscreen()
        this.setState({ isFullscreen: newIsFullscreen })
      }

      this.clearAutoHideControlsTimer()
    }
  }

  hasClickableElements(event) {
    const elements = eventPath(event)
    const clickableElements = elements.filter(element => {
      return (element.classList && element.classList.contains('button')) ||
        element.tagName === 'A' ||
        element.tagName === 'BUTTON'
    })

    return clickableElements.length > 0
  }

  render () {
    return (
      <div className={`roomPage roomActive ${this.state.showChat ? 'showChat' : 'hideChat'} ${this.state.showControls ? 'showControls' : 'hideControls'}`}>
        <Head>
          <title>Video Chat | bipbop</title>
          <meta key='viewport' name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1' />
        </Head>
        <VideoChat conference={this.props.conference} onLeave={this.props.onLeave} onToggleChat={this.handleToggleChat} />
        <TextChat conference={this.props.conference} />
      </div>
    )
  }
}
