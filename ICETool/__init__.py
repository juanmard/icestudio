#!/usr/bin/env python3

from sys import (
    argv as sys_argv,
    exit as sys_exit,
    stdout as sys_stdout,
    stderr as sys_stderr
)
from os import getenv
from shutil import which
from pathlib import Path
from subprocess import check_call
import click
import re
import json

from ICETool.constraints.constraints import getBoardsInfo


def getBoard(board):
    """
    Get board info from hdl/constraints.
    """
    ConvertBoardNameFromIcestudioToConstraints = {
        "icezum": "IceZumAlhambra",
        "alhambra-ii": "IceZumAlhambraII",
        "icestick": "IceStick",
        "upduino": "UPDuino-v1.0",
        "upduino2": "UPDuino-v2.0",
        "upduino21": "UPDuino-v2.1",
        "upduino3": "UPDuino-v3.0"
    }
    boardInfo = getBoardsInfo(verbose=False)[(
        ConvertBoardNameFromIcestudioToConstraints[board]
        if board in ConvertBoardNameFromIcestudioToConstraints else
        board
    )]
    print(boardInfo)
    return boardInfo


def execCommand(cmd, cwd):
    """
    Print a command, execute it, and flush stdout and stderr.
    """
    print(cmd)
    check_call(cmd, cwd=cwd)
    sys_stdout.flush()
    sys_stderr.flush()


@click.command("verify")
@click.pass_context
@click.option("-p", "--project-dir", type=str, metavar="path", help="Set the target directory for the project.")
@click.option("-b", "--board", type=str, metavar="board", help="Set the board.")
@click.option("-v", "--verbose", is_flag=True, help="Show the entire output of the command.")
def VerifyCommand(ctx, board, project_dir, verbose):
    """
    Verify verilog sources through Icarus Verilog.
    """

    YOSYS_SHARE_PATH = Path(which('yosys')).parent.parent / 'share/yosys'

    boardInfo = getBoard(board)

    device = boardInfo.Device.split('-')[0].lower()

    sources = " ".join([item.name for item in Path(project_dir).glob("*.v")])

    opts = '-D NO_ICE40_DEFAULT_ASSIGNMENTS' if device == 'ice40' else '-D NO_INCLUDES'

    execCommand(
        f'iverilog -D VCD_OUTPUT=sim.vcd {opts} {YOSYS_SHARE_PATH!s}/{device}/cells_sim.v {sources}',
        project_dir
    )

    print("verbose:", verbose)

    ctx.exit(0)


@click.command("build")
@click.pass_context
@click.option("-b", "--board", type=str, metavar="board", help="Set the board.")
@click.option("--device", type=str, metavar="device", help="Set the FPGA device.")
@click.option("--package", type=str, metavar="package", help="Set the FPGA package.")
@click.option("-p", "--project-dir", type=str, metavar="path", help="Set the target directory for the project.")
@click.option("-v", "--verbose", is_flag=True, help="Show the entire output of the command.")
@click.option("--verbose-yosys", is_flag=True, help="Show the yosys output of the command.")
@click.option("--verbose-pnr", is_flag=True, help="Show the pnr output of the command.")
def BuildCommand(ctx, board, device, package, project_dir, verbose, verbose_yosys, verbose_pnr):
    """
    Generate bitstream through Yosys and Nextpnr.
    """

    sources = " ".join([item.name for item in Path(project_dir).glob("*.v")])
    opts = '' if verbose or verbose_yosys else '-q'

    execCommand(
        f'yosys {opts} -p "proc; read_verilog {sources}; synth_ice40 -top main -json synth.json"',
        project_dir
    )

    boardInfo = getBoard(board)
    device = boardInfo.Device.split('-')[1].lower() if device is None else device
    package = boardInfo.Package.lower() if package is None else package
    pcf = [item.name for item in Path(project_dir).glob("*.pcf")][0]
    opts = '' if verbose or verbose_pnr else '-q'

    execCommand(
        f'nextpnr-ice40 {opts} --{device} --package {package} --pcf {pcf} --json synth.json --asc pnr.asc',
        project_dir
    )

    execCommand(
        'icepack pnr.asc design.bin',
        project_dir
    )

    ctx.exit(0)


@click.command("upload")
@click.pass_context
@click.option("-b", "--board", type=str, metavar="board", help="Set the board.")
@click.option("--serial-port", type=str, metavar="serial-port", help="Set the serial port.")
@click.option("--ftdi-id", type=str, metavar="ftdi-id", help="Set the FTDI id.")
@click.option("-s", "--sram", is_flag=True, help="Perform SRAM programming.")
@click.option("-f", "--flash", is_flag=True, help="Perform FLASH programming.")
@click.option("-p", "--project-dir", type=str, metavar="path", help="Set the target directory for the project.")
@click.option("-v", "--verbose", is_flag=True, help="Show the entire output of the command.")
@click.option("--verbose-yosys", is_flag=True, help="Show the yosys output of the command.")
@click.option("--verbose-pnr", is_flag=True, help="Show the pnr output of the command.")
def UploadCommand(ctx, board, serial_port, ftdi_id, sram, flash, project_dir, verbose, verbose_yosys, verbose_pnr):
    """
    Upload bitstream to the board through openFPGALoader.
    """

    print("board:", board)
    print("serial_port:", serial_port)
    print("ftdi_id:", ftdi_id)
    print("sram:", sram)
    print("flash:", flash)
    print("verbose:", verbose)
    print("verbose_yosys:", verbose_yosys)
    print("verbose_pnr:", verbose_pnr)

    ctx.exit(0)


@click.command("regenerate-pinouts")
@click.pass_context
@click.option("-d", "--rdir", type=str, metavar="rdir", help="Resources directory.")
def RegeneratePinoutsCommand(ctx, rdir):
    p = Path(rdir)

    for item in list(p.glob('*')):
        if item.is_dir() and item.name[0] != '_':
            path = item
            cfile = path / 'pinout.pcf'
            if not cfile.exists():
                cfile = path / 'pinout.lpf'
                if not cfile.exists():
                    raise Exception('No known constraints file found in %s', str(path))

            print('· Processing %s file %s' % (item.name, cfile.name))

            pattern = 'set_io\s+(--warn-no-port|-nowarn)?\s*(.*?)\s+(.*?)\s+(#+\s+)?' if cfile.suffix == '.pcf' else r'LOCATE\s*?COMP\s*?"(.*)"\s*?SITE\s*?"(.*)";\s*?#?\s*?'
            pinout = re.findall(pattern, cfile.read_text())

            if len(pinout) == 0:
                print('  !!! Something went wrong; empty pinout list')
                continue

            info = json.loads((path / 'info.json').read_text())

            info['pinout'] = { item[1]: item[2] for item in sorted(pinout, key=lambda pinout: pinout[1],reverse=True) } if cfile.suffix == '.pcf' else { item[0]: item[1] for item in pinout }

            (path / 'info.json').write_text(json.dumps(info, indent=2) + "\n")


@click.group()
def cli():
    pass

cli.add_command(VerifyCommand)
cli.add_command(BuildCommand)
cli.add_command(UploadCommand)
cli.add_command(RegeneratePinoutsCommand)


if __name__ == '__main__':
    cli()
