using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Windows.Forms;

namespace TerrainEditor
{
    class DraggablePoint
    {
        //Public
        public float x;
        public float y;
        public float w;
        public float h;
        public Color c;
        public PictureBox canvas;
        public static event EventHandler PointDragged;

        //Properties
        public PointF Point
        {
            get { return new PointF(x, y); }
        }


        //Private
        static List<DraggablePoint> hoveredObjects = new List<DraggablePoint>();
        bool dragging;

        public DraggablePoint(PictureBox canvas, float x, float y, float w, float h, Color c)
        {
            //Set variables
            this.w = w;
            this.h = h;
            this.x = x;
            this.y = y;
            this.canvas = canvas;
            this.c = c;

            //Setup Requirements
            this.canvas.MouseDown += OnMouseDown;
            this.canvas.MouseUp += OnMouseUp;
            this.canvas.MouseMove += OnMouseMove;
        }

        public DraggablePoint(PictureBox canvas, RectangleF rect, Color c)
            : this(canvas, rect.X, rect.Y, rect.Width, rect.Height, c)
        { }

        private void OnMouseDown(object sender, MouseEventArgs e)
        {
            Console.WriteLine("MouseDown");
            if (hoveredObjects.Contains(this))
                dragging = true;
        }
        private void OnMouseUp(object sender, MouseEventArgs e)
        {
            Console.WriteLine("MouseUp");
            dragging = false;
        }

        private void OnMouseMove(object sender, MouseEventArgs e)
        {
            Console.WriteLine(hoveredObjects.Count);
            if ((new RectangleF((float)Math.Floor(x - w / 2), (float)Math.Floor(y - h / 2), w + 1, h + 1)).Contains(e.Location))
            {
                if (!hoveredObjects.Contains(this))
                    hoveredObjects.Add(this);
            }
            else
                hoveredObjects.Remove(this);

            if (dragging)
            {
                x = e.X;
                y = e.Y;

                PointDragged(this, new EventArgs());
                //canvas.Invalidate();
            }

            if (hoveredObjects.Count > 0)
                canvas.Cursor = Cursors.Hand;
            else
                canvas.Cursor = Cursors.Default;
        }

        ~DraggablePoint()
        {
            hoveredObjects.Remove(this);
        }

        public void Paint(Graphics gfx)
        {
            gfx.FillEllipse(new SolidBrush(c), new RectangleF(x - w / 2, y - h / 2, w, h));
        }
    }
}
