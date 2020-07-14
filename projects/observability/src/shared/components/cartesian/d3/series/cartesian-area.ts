import { BaseType, select, Selection } from 'd3-selection';
import { area, curveMonotoneX, Line } from 'd3-shape';
import { MouseDataLookupStrategy } from '../../../utils/mouse-tracking/mouse-tracking';
import { Series } from '../../chart';
import { QuadtreeDataLookupStrategy } from '../interactivity/data-strategy/quadtree-data-lookup-strategy';
import { CartesianLine } from './cartesian-line';
import { CartesianSeries } from './cartesian-series';
import { rgb } from 'd3-color';

export class CartesianArea<TData> extends CartesianSeries<TData> {
  private static readonly CSS_CLASS: string = 'area-data-series';

  public drawSvg(element: BaseType): void {
    const seriesGroup = select(element).append('g').classed(CartesianArea.CSS_CLASS, true);
    this.drawAreaGradient(element);
    this.drawSvgArea(seriesGroup);
    this.buildLine().drawSvg(seriesGroup.node()!);
  }

  public drawCanvas(context: CanvasRenderingContext2D): void {
    this.drawCanvasArea(context);

    this.buildLine().drawCanvas(context);
  }

  protected buildMultiAxisDataLookupStrategy(): MouseDataLookupStrategy<TData, Series<TData>> {
    return new QuadtreeDataLookupStrategy(this.series, this.series.data, this.xScale, this.yScale);
  }

  private drawSvgArea(seriesGroupSelection: Selection<SVGGElement, unknown, null, undefined>): void {
    seriesGroupSelection
      .append('path')
      .attr('d', this.buildArea()(this.series.data)!)
      .style('fill', `url(#linear-gradient-${this.series.name})`);
  }

  private drawCanvasArea(context: CanvasRenderingContext2D): void {
    context.save();
    context.beginPath();
    this.buildArea().context(context)(this.series.data);
    context.strokeStyle = this.series.color;
    context.fillStyle = this.series.color;
    context.globalAlpha = 0.4;
    context.fill();
    context.restore();
  }

  private buildArea(): Line<TData> {
    return area<TData>()
      .x(d => this.xScale.transformData(d))
      .y1(d => this.yScale.transformData(d))
      .y0(() => this.yScale.getRangeStart())
      .curve(curveMonotoneX);
  }

  private buildLine(): CartesianLine<TData> {
    return new CartesianLine({ ...this.series, symbol: undefined }, this.scaleBuilder);
  }

  private drawAreaGradient(element: BaseType): void {
    const chartSelection = select(element);
    const radialGradient = chartSelection
      .selectAll(`defs.area-gradient-${this.series.name}`)
      .data([this.series])
      .enter()
      .append('defs')
      .append('linearGradient')
      .attr('id', `linear-gradient-${this.series.name}`)
      .attr('gradientTransform', 'rotate(90)')
      .classed(`area-gradient-${this.series.name}`, true);

    radialGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', series => {
        const c = rgb(series.color);
        c!.opacity = 0.24;
        return c!.toString();
      });

    radialGradient
      .append('stop')
      .attr('offset', '80%')
      .attr('stop-color', series => {
        const c = rgb(series.color);
        c!.opacity = 0;
        return c!.toString();
      });
  }
}
