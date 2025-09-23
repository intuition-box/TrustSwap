import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { trackEvent } from "./umami"

const PageViewTracker = () => {
    const location = useLocation()

    useEffect(() => {
        // Track page view whenever location changes
        trackEvent("page_view", location.pathname, { path: location.pathname })
    }, [location])

    return null // This component doesn't render anything
}

export default PageViewTracker 
