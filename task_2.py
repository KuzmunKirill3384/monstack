'''Задание 2. Рассмотреть следующие вероятностные стратегии игроков: оба игрока равновероятно
(с вероятностью ½) выбирают одну или другую строку/столбец.
Провести 100 экспериментов и сохранить вектор из 100 пар бинарных чисел,
соответствующих результатам случайного выбора строк/столбцов.
Найти выигрыш/проигрыш игрока A (проигрыш/выигрыш игрока B)
в проведенном эксперименте. Найти его среднее значение в одной игре.
Найти математическое ожидание этой величины (теоретическую оценку выигрыша/проигрыша).
Найти среднее квадратичное отклонение от экспериментального среднего в проведенном эксперименте.
Найти дисперсию и теоретическое среднее квадратичное отклонение для данных вероятностей.'''

import random
import math

# Матрица выигрышей
matrix = [[10, -3],
          [-2, 8]]

def generate_choice(p):
    """Генерация случайного выбора с вероятностью p"""
    return 1 if random.random() < p else 0

def create_data(n):
    """Генерация данных для экспериментов"""
    data = []
    for _ in range(n):
        data.append([generate_choice(0.5), generate_choice(0.5)])
    return data

def calculate_theoretical_expectation(matrix):
    """Расчет теоретического математического ожидания"""
    expectation = 0
    for i in range(2):
        for j in range(2):
            expectation += 0.25 * matrix[i][j]  # Вероятность каждого случая 1/4
    return expectation

def calculate_theoretical_variance(matrix, expectation):
    """Расчет теоретической дисперсии"""
    variance = 0
    for i in range(2):
        for j in range(2):
            variance += 0.25 * (matrix[i][j] - expectation) ** 2
    return variance

def main():
    n_experiments = 100000
    data = create_data(n_experiments)

    # Вычисление выигрышей
    results_a = []  # Выигрыши игрока A
    results_b = []  # Проигрыши игрока B (симметрично выигрышам A)

    for s_ch, st_ch in data:
        result_a = matrix[s_ch][st_ch]  # Выигрыш игрока A из выбранной строки и столбца
        results_a.append(result_a)
        results_b.append(-result_a)  # Проигрыш игрока B равен -выигрышу игрока A

    # Среднее значение выигрыша/проигрыша
    mean_experimental_a = sum(results_a) / n_experiments
    mean_experimental_b = sum(results_b) / n_experiments

    # Теоретическое математическое ожидание
    theoretical_expectation = calculate_theoretical_expectation(matrix)

    # Среднее квадратичное отклонение
    experimental_std_dev_a = math.sqrt(sum((x - mean_experimental_a) ** 2 for x in results_a) / n_experiments)
    experimental_std_dev_b = math.sqrt(sum((x - mean_experimental_b) ** 2 for x in results_b) / n_experiments)

    # Дисперсия и теоретическое СКО
    theoretical_variance = calculate_theoretical_variance(matrix, theoretical_expectation)
    theoretical_std_dev = math.sqrt(theoretical_variance)

    # Вывод результатов
    print("Экспериментальные данные:")
    print(f"Средний выигрыш игрока A (эксперимент): {mean_experimental_a}")
    print(f"Среднее квадратичное отклонение игрока A (эксперимент): {experimental_std_dev_a}")
    print(f"Среднее квадратичное отклонение игрока B (эксперимент): {experimental_std_dev_b}")

    print("\nТеоретические данные:")
    print(f"Математическое ожидание выигрыша/проигрыша игрока A: {theoretical_expectation}")
    print(f"Дисперсия выигрыша/проигрыша: {theoretical_variance}")
    print(f"Среднее квадратичное отклонение: {theoretical_std_dev}")

if __name__ == '__main__':
    main()