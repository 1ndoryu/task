export function LandingSortingAnimation(): JSX.Element {
    return (
        <div className="landingSortingWidget">
            {/* Background elements or header can be added if needed, but keeping it clean for now */}
            <div className="landingSortItem item-1">
                <div className="landingSortIcon urgent" />
                <div className="landingSortText">
                    <div className="landingLine primary" />
                    <div className="landingLine secondary" />
                </div>
                <div className="landingSortTag urgent">Urgent</div>
            </div>

            <div className="landingSortItem item-2">
                <div className="landingSortIcon high" />
                <div className="landingSortText">
                    <div className="landingLine primary" />
                </div>
                <div className="landingSortTag high">High</div>
            </div>

            <div className="landingSortItem item-3">
                <div className="landingSortIcon normal" />
                <div className="landingSortText">
                    <div className="landingLine primary" />
                    <div className="landingLine secondary" />
                </div>
                <div className="landingSortTag normal">Normal</div>
            </div>

            <div className="landingSortItem item-4">
                <div className="landingSortIcon low" />
                <div className="landingSortText">
                    <div className="landingLine primary" />
                </div>
                <div className="landingSortTag low">Low</div>
            </div>
        </div>
    );
}

export default LandingSortingAnimation;
