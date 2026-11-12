import math
import sys, os

from OpenGL.GL import *
from OpenGL.GLUT import *

w = 500
h = 500

day = 0.0
pause = False


def draw_polygon(num_sides, radius=0.5):
    angle = 2 * math.pi / num_sides
    glBegin(GL_LINE_LOOP)
    for i in range(num_sides):
        x = radius * math.cos(i * angle)
        y = radius * math.sin(i * angle)
        glVertex2f(x, y)
    glEnd()


def draw():
    print(f"day: {day}")

    glClear(GL_COLOR_BUFFER_BIT)
    glLineWidth(2.0)
    glLoadIdentity()

    sun_spin = (day/25.0) * 360.0
    # sun orbit
    glColor3f(1.0, 0.0, 0.0)
    glPushMatrix() # sun push
    glRotatef(sun_spin, 0, 0, 1)
    draw_polygon(3, radius=0.15)
    glPopMatrix() # sun pop

    earth_orbit = (day / 365.0) * 360.0
    mars_orbit = (day / 687.0) * 360.0

    earth_moon_orbit = (day / 27.0) * 360.0
    mars_moon_orbit = (day / 30.0) * 360.0

    # earth orbit
    glColor3f(0.0, 1.0, 0.0)
    glPushMatrix() # earsh push
    glRotatef(earth_orbit, 0, 0, 1)
    glTranslatef(0.4, 0.0, 0.0)
    draw_polygon(4, radius=0.08)

    # earth moon
    glColor3f(1.0, 1.0, 0.0)
    glPushMatrix() # earth moon push
    glRotatef(earth_moon_orbit, 0, 0, 1)
    glTranslatef(0.15, 0.0, 0.0)
    draw_polygon(6, radius=0.05)
    glPopMatrix() # earth moon pop
    
    glPopMatrix() # earth pop

    # mars orbit
    glColor3f(0.0, 0.0, 1.0)
    glPushMatrix() # mars push
    glRotatef(mars_orbit, 0, 0, 1)
    glTranslatef(0.8, 0.0, 0.0)
    draw_polygon(5, radius=0.08)

    # mars moon
    glColor3f(1.0, 1.0, 1.0)
    glPushMatrix() # mars moon push
    glRotatef(mars_moon_orbit, 0, 0, 1)
    glTranslatef(0.12, 0.0, 0.0)
    draw_polygon(3, radius=0.04)
    glPopMatrix() # mars moon pop

    glPopMatrix() # mars pop

    glutSwapBuffers()

def timer(value):
    global day
    if not pause:
        day += 1
        glutSetWindowTitle(f"Solar system  day = {day:.0f}".encode())
        glutPostRedisplay()
    glutTimerFunc(1000//30, timer, 0)

def keyboard(key, x, y):
    global day, pause
    if key == b' ': #spaceBar
        pause = not pause
    elif key == b'\x1b':
        os._exit(0)
    glutSetWindowTitle(f"Solar system  day = {day:.0f}".encode())
    glutPostRedisplay()


def main():
    glutInit()
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB)
    glutInitWindowSize(w, h)
    glutInitWindowPosition(100, 100)
    glutCreateWindow(b"Solar system  day = 0")
    glutDisplayFunc(draw)
    glutTimerFunc(0, timer, 0)
    glutKeyboardFunc(keyboard)
    glutMainLoop()


if __name__ == "__main__":
    main()
